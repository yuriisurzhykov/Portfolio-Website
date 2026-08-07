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
 * Increments and sets expiry in ONE atomic Redis round trip (Lua script) —
 * not two separate `incr` + `expire` calls, which could leave a counter
 * with no TTL if interrupted between them. Found via PR review, see README.
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
        // Expiry is set only on count === 1 (checked inside the script) so later
        // increments don't keep pushing the window out forever.
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
 * Thrown by `getRateLimiter()` — see its own comment for when and why.
 * Named by `.name`, not by `instanceof`, for callers to check: this class
 * crosses the exact Server-Component-vs-Route-Handler/Edge-proxy bundle
 * boundary `backend/src/errors.ts`'s `isDatabaseUnavailableError` already
 * documents (Turbopack compiles `@portfolio/backend`/`@portfolio/backend/edge`
 * separately per execution context), so `instanceof` across that boundary
 * would silently evaluate to `false` even for the "same" class.
 */
export class RateLimiterMisconfiguredError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "RateLimiterMisconfiguredError";
    }
}

/**
 * Checked by name, not `instanceof RateLimiterMisconfiguredError` — see
 * that class's own comment for why. This is what lets
 * `checkAndRecordResilient` below tell "Upstash was never configured, this
 * is a deploy bug" (must keep failing loudly, NOT be silently absorbed
 * into the same graceful fallback a transient network error gets) apart
 * from every other kind of failure a rate-limiter backend can throw.
 */
function isRateLimiterMisconfiguredError(error: unknown): boolean {
    return error instanceof Error && error.name === "RateLimiterMisconfiguredError";
}

/**
 * Picks the backend once per process based on whether Upstash credentials
 * are configured, then reuses that same instance — not re-decided per
 * call, so a misconfigured environment fails the same way for the whole
 * process lifetime instead of flapping between backends. Exported (not
 * just used internally) so a route/test can inject a specific limiter
 * instead of going through env-var detection.
 *
 * Throws `RateLimiterMisconfiguredError` instead of silently falling back
 * to `InMemoryRateLimiter` when `NODE_ENV === "production"` and Upstash
 * credentials are absent — found during the OWASP audit remediation: a
 * forgotten env var on a real deploy would otherwise quietly downgrade
 * brute-force protection to per-process, per-restart counters with zero
 * signal that anything was wrong. `DISABLE_RATE_LIMIT` is exempted (same
 * flag `frontend/src/proxy.ts`'s own comment documents as
 * "E2E-suite-only, never set in dev or prod") so the Playwright suite's
 * `next build && next start` — which sets `NODE_ENV=production` itself,
 * same as a real deploy, with no real Upstash instance to point at — isn't
 * mistaken for one.
 */
export function getRateLimiter(): RateLimiter {
    if (!cachedLimiter) {
        const url = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;
        if (url && token) {
            cachedLimiter = new UpstashRateLimiter(new Redis({ url, token }));
        } else if (process.env.NODE_ENV === "production" && process.env.DISABLE_RATE_LIMIT !== "true") {
            throw new RateLimiterMisconfiguredError(
                "UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN must be set in production — refusing to silently fall back to a per-process in-memory rate limiter with far weaker brute-force protection once horizontally scaled.",
            );
        } else {
            cachedLimiter = new InMemoryRateLimiter();
        }
    }
    return cachedLimiter;
}

/** Test-only escape hatch — lets tests inject a fresh limiter instead of sharing the process-wide singleton (or fighting env vars neither set nor unset it reliably mid-suite). */
export function setRateLimiterForTesting(limiter: RateLimiter | undefined): void {
    cachedLimiter = limiter;
}

let fallbackLimiter: InMemoryRateLimiter | undefined;

/**
 * The actual runtime resilience layer, shared by both `checkRateLimit`
 * (proxy.ts's general tiers) and `checkLoginRateLimit` below — NOT
 * duplicated as a try/catch at each call site, so both benefit from one
 * definition of "what counts as recoverable" instead of two that could
 * drift. A transient failure from the configured limiter itself (Upstash
 * unreachable, a network blip, a bad response) falls back to one shared
 * `InMemoryRateLimiter` instance for the rest of THIS process's lifetime
 * (not a fresh one per call, which would never accumulate a real count) —
 * this favors availability (every request still gets served, just with
 * weaker, per-instance-only rate limiting until Upstash recovers) over
 * strictly enforcing the limit, matching this repo's existing "prefer a
 * graceful fallback over a crash" default for a dependency being
 * temporarily down (see `DatabaseUnavailableError`'s own reasoning).
 *
 * `RateLimiterMisconfiguredError` is deliberately let through UNCAUGHT —
 * see `getRateLimiter()`'s own comment for why that one specific failure
 * must keep failing loudly instead of being absorbed into the same
 * fallback.
 */
async function checkAndRecordResilient(key: string, limit: number, windowSeconds: number): Promise<RateLimitCheck> {
    const limiter = getRateLimiter();
    try {
        return await limiter.checkAndRecord(key, limit, windowSeconds);
    } catch (error) {
        if (isRateLimiterMisconfiguredError(error)) {
            throw error;
        }
        console.error("Rate limiter backend failed; falling back to a per-instance in-memory limiter for this call.", error);
        if (!fallbackLimiter) {
            fallbackLimiter = new InMemoryRateLimiter();
        }
        return fallbackLimiter.checkAndRecord(key, limit, windowSeconds);
    }
}

/** Test-only escape hatch, same reasoning as `setRateLimiterForTesting` — lets a test force a fresh fallback bucket set instead of sharing state left over from a previous test. */
export function setFallbackLimiterForTesting(limiter: InMemoryRateLimiter | undefined): void {
    fallbackLimiter = limiter;
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
    return checkAndRecordResilient(`login:${ key }`, LOGIN_ATTEMPT_LIMIT, LOGIN_WINDOW_SECONDS);
}

/**
 * Called after a successful login so a few earlier typos don't linger
 * against the count for either dimension. Deliberately swallows (logs,
 * doesn't rethrow) any failure from the CONFIGURED limiter's `reset()` —
 * found during the OWASP audit remediation: `login/route.ts` calls this
 * AFTER `login()` already succeeded, inside the same try/catch that turns
 * any thrown error into an error response, so an Upstash hiccup here used
 * to turn an otherwise-correct login into a 500 for the admin.
 *
 * ALSO resets the shared `fallbackLimiter`'s own matching key, if one
 * exists — found by review, not by running it: if Upstash is down for
 * long enough that `checkAndRecordResilient` starts recording login
 * attempts against `fallbackLimiter` instead, resetting only the
 * (unreachable) configured limiter here does NOTHING to that fallback's
 * count — it keeps climbing across every successful login for the whole
 * outage, since nothing else ever clears it. This app has exactly one
 * admin account (`prisma/schema.prisma`'s own comment on `User`), so a
 * handful of legitimate logins during a real outage — plausibly BECAUSE
 * the admin is troubleshooting that very outage — would eventually trip
 * the fallback's own limit and 429 the one real admin, defeating the
 * entire point of falling back to keep the site usable. Safe to call
 * unconditionally whenever a fallback exists: `InMemoryRateLimiter.reset()`
 * on a key it never saw is a harmless no-op (`Map.delete` of a missing
 * key), so this doesn't need to know whether the fallback was actually
 * used for this specific key before clearing it.
 */
export async function resetLoginRateLimit(key: string): Promise<void> {
    const limiter = getRateLimiter();
    try {
        await limiter.reset(`login:${ key }`);
    } catch (error) {
        console.error("Rate limiter backend failed while resetting a login counter after a successful login; ignoring.", error);
    }
    if (fallbackLimiter) {
        await fallbackLimiter.reset(`login:${ key }`);
    }
}

/** General-purpose entry point for `proxy.ts`'s per-IP tiers (global/refresh/admin-mutation budgets) — a thin, explicitly-named wrapper so call sites read as intent ("check this rate limit") rather than reaching into `getRateLimiter()` directly. */
export function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitCheck> {
    return checkAndRecordResilient(key, limit, windowSeconds);
}
