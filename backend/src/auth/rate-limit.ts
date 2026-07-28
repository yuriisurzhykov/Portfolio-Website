import { Redis } from "@upstash/redis";

export interface RateLimitCheck {
    allowed: boolean;
    retryAfterSeconds?: number;
}

/**
 * Fixed-window "increment and check" counter — one primitive reused for
 * every tier (login-per-IP, login-per-account, the general per-IP budgets
 * in `proxy.ts`). `checkAndRecord` always counts the call, whether the
 * caller's own action succeeds or fails; `reset` exists on top of that for
 * the one case that wants forgiveness (a successful login clears prior
 * failed attempts — see `checkLoginRateLimit`'s callers).
 *
 * Not a sliding-window/token-bucket algorithm — a plain fixed window can
 * momentarily allow up to ~2x the stated limit right at a window boundary
 * (a burst at the end of one window plus a burst at the start of the
 * next). Accepted trade-off for brute-force/abuse protection specifically:
 * the goal is "make sustained abuse expensive," not "enforce the limit to
 * the exact request," and a fixed window is one Redis round trip instead
 * of the extra bookkeeping a true sliding window needs.
 */
export interface RateLimiter {
    checkAndRecord(key: string, limit: number, windowSeconds: number): Promise<RateLimitCheck>;
    reset(key: string): Promise<void>;
}

/**
 * Local-dev/test fallback — used automatically when Upstash credentials
 * aren't configured. Same limitation the interim in-memory limiter this
 * replaces always had: state lives in this one process's memory, so it
 * doesn't survive a restart and doesn't see traffic hitting a *different*
 * process if this app is ever horizontally scaled — which is exactly why
 * this is the fallback, not the real implementation (see
 * `UpstashRateLimiter` below).
 */
export class InMemoryRateLimiter implements RateLimiter {
    private readonly buckets = new Map<string, { count: number; resetAt: number }>();

    async checkAndRecord(key: string, limit: number, windowSeconds: number): Promise<RateLimitCheck> {
        const now = Date.now();
        const bucket = this.buckets.get(key);

        if (!bucket || bucket.resetAt < now) {
            this.buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
            return { allowed: true };
        }

        bucket.count += 1;
        if (bucket.count > limit) {
            return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
        }
        return { allowed: true };
    }

    async reset(key: string): Promise<void> {
        this.buckets.delete(key);
    }
}

/**
 * A minimal shape of `@upstash/redis`'s client — declared explicitly so
 * `UpstashRateLimiter` can be unit-tested against a plain mock object
 * instead of a real (or even a fake-but-still-network-shaped) Redis
 * client. Only the commands this file actually issues.
 */
export interface RedisCommands {
    eval<TData = unknown>(script: string, keys: string[], args: unknown[]): Promise<TData>;
    ttl(key: string): Promise<number>;
    del(key: string): Promise<number>;
}

/**
 * Increments the counter and sets its expiry as ONE atomic Redis operation
 * (a Lua script runs entirely server-side, in a single round trip) —
 * NOT two separate `incr` + `expire` calls. Two separate calls leave a real
 * gap: if the process is interrupted, or the `expire` request itself fails
 * over the network, after `incr` already succeeded, Redis is left with a
 * counter that has NO expiry at all. Every later call keeps incrementing
 * that same key forever with no TTL to reset it, permanently blocking
 * whatever key crossed the limit at that moment — found via a real PR
 * review comment, not hypothetically; see backend/src/auth/README.md.
 */
const INCR_AND_EXPIRE_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return count
`;

/**
 * The real implementation — one shared counter in Redis, reachable from
 * every Next.js instance behind a load balancer, unlike the in-memory
 * fallback above. `@upstash/redis`'s client talks to Upstash over its
 * plain HTTPS REST API (not a persistent TCP connection), so it works
 * identically in `proxy.ts`'s Edge runtime and in ordinary Node Route
 * Handlers — no "works in Node, breaks on Edge" risk the way a
 * TCP-based Redis client would have (same reasoning as `jose` over
 * `jsonwebtoken` for JWTs — see this folder's README).
 */
export class UpstashRateLimiter implements RateLimiter {
    constructor(private readonly redis: RedisCommands) {}

    async checkAndRecord(key: string, limit: number, windowSeconds: number): Promise<RateLimitCheck> {
        // Only the request that just created the key (count === 1, checked
        // INSIDE the script) sets its expiry — every subsequent increment in
        // the same window must NOT touch it, or a steady trickle of requests
        // would keep pushing the window out forever and the limit would
        // never reset.
        const count = await this.redis.eval<number>(INCR_AND_EXPIRE_SCRIPT, [key], [windowSeconds]);

        if (count > limit) {
            const ttl = await this.redis.ttl(key);
            return { allowed: false, retryAfterSeconds: ttl > 0 ? ttl : windowSeconds };
        }
        return { allowed: true };
    }

    async reset(key: string): Promise<void> {
        await this.redis.del(key);
    }
}

let cachedLimiter: RateLimiter | undefined;

/**
 * Picks the backend once per process based on whether Upstash credentials
 * are configured, then reuses that same instance — not re-decided per
 * call, so a misconfigured environment fails the same way for the whole
 * process lifetime instead of flapping between backends. Exported (not
 * just used internally) so a route/test can inject a specific limiter
 * instead of going through env-var detection.
 */
export function getRateLimiter(): RateLimiter {
    if (!cachedLimiter) {
        const url = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;
        cachedLimiter = url && token
            ? new UpstashRateLimiter(new Redis({ url, token }))
            : new InMemoryRateLimiter();
    }
    return cachedLimiter;
}

/** Test-only escape hatch — lets tests inject a fresh limiter instead of sharing the process-wide singleton (or fighting env vars neither set nor unset it reliably mid-suite). */
export function setRateLimiterForTesting(limiter: RateLimiter | undefined): void {
    cachedLimiter = limiter;
}

// ---------------------------------------------------------------------------
// Named tiers — see backend/src/auth/README.md for why these specific
// numbers, and `web/src/proxy.ts` for the general (non-login) tiers.
// ---------------------------------------------------------------------------

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_WINDOW_SECONDS = 15 * 60;

/**
 * Rate-limits `/api/auth/login`, keyed by whatever the caller passes in —
 * the route calls this twice per request, once for `ip:<address>` and once
 * for `account:<email>` (see login/route.ts), so a distributed attack
 * (many IPs, one target account) and a targeted single-IP attack are both
 * caught by the same primitive, just different keys. Counts EVERY attempt
 * (successful or not) against the budget, not only failures — simpler than
 * the interim version this replaces, and strictly more defensive (the old
 * "only failures count" version let an attacker interleave one correct
 * guess among many wrong ones to keep the counter from ever tripping).
 */
export function checkLoginRateLimit(key: string): Promise<RateLimitCheck> {
    return getRateLimiter().checkAndRecord(`login:${ key }`, LOGIN_ATTEMPT_LIMIT, LOGIN_WINDOW_SECONDS);
}

/** Called after a successful login so a few earlier typos don't linger against the count for either dimension. */
export function resetLoginRateLimit(key: string): Promise<void> {
    return getRateLimiter().reset(`login:${ key }`);
}

/** General-purpose entry point for `proxy.ts`'s per-IP tiers (global/refresh/admin-mutation budgets) — a thin, explicitly-named wrapper so call sites read as intent ("check this rate limit") rather than reaching into `getRateLimiter()` directly. */
export function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitCheck> {
    return getRateLimiter().checkAndRecord(key, limit, windowSeconds);
}
