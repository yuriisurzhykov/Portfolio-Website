import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    checkLoginRateLimit,
    checkRateLimit,
    getRateLimiter,
    InMemoryRateLimiter,
    RateLimiterMisconfiguredError,
    resetLoginRateLimit,
    setFallbackLimiterForTesting,
    setRateLimiterForTesting,
    UpstashRateLimiter,
    type RateLimiter,
    type RedisCommands,
} from "./rate-limit";

function uniqueKey(): string {
    return `test-${ Math.random().toString(36).slice(2) }`;
}

describe("InMemoryRateLimiter", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("allows a key that has never been seen before", async () => {
        const limiter = new InMemoryRateLimiter();
        expect((await limiter.checkAndRecord(uniqueKey(), 10, 900)).allowed).toBe(true);
    });

    it("still allows requests up to and including the limit", async () => {
        const limiter = new InMemoryRateLimiter();
        const key = uniqueKey();
        let last;
        for (let i = 0; i < 10; i++) last = await limiter.checkAndRecord(key, 10, 900);
        expect(last!.allowed).toBe(true);
    });

    it("blocks once the count exceeds the limit", async () => {
        const limiter = new InMemoryRateLimiter();
        const key = uniqueKey();
        let last;
        for (let i = 0; i < 11; i++) last = await limiter.checkAndRecord(key, 10, 900);
        expect(last!.allowed).toBe(false);
        expect(last!.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("reset clears the block for that key", async () => {
        const limiter = new InMemoryRateLimiter();
        const key = uniqueKey();
        for (let i = 0; i < 11; i++) await limiter.checkAndRecord(key, 10, 900);
        expect((await limiter.checkAndRecord(key, 10, 900)).allowed).toBe(false);

        await limiter.reset(key);
        expect((await limiter.checkAndRecord(key, 10, 900)).allowed).toBe(true);
    });

    it("tracks different keys independently", async () => {
        const limiter = new InMemoryRateLimiter();
        const keyA = uniqueKey();
        const keyB = uniqueKey();
        for (let i = 0; i < 11; i++) await limiter.checkAndRecord(keyA, 10, 900);

        expect((await limiter.checkAndRecord(keyA, 10, 900)).allowed).toBe(false);
        expect((await limiter.checkAndRecord(keyB, 10, 900)).allowed).toBe(true);
    });

    it("computes retryAfterSeconds precisely from the real window, not just as some positive number", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const limiter = new InMemoryRateLimiter();
        const key = uniqueKey();
        for (let i = 0; i < 10; i++) await limiter.checkAndRecord(key, 10, 900); // resetAt = 900_000

        vi.setSystemTime(1000); // 1 real second later
        const result = await limiter.checkAndRecord(key, 10, 900);
        expect(result.allowed).toBe(false);
        expect(result.retryAfterSeconds).toBe(900 - 1);
    });

    /**
     * Found by mutation testing on the version this replaces: pins the
     * exact boundary (`resetAt < now`, not `<=`) — at the instant `now`
     * equals `resetAt` the window has NOT expired yet (still blocked),
     * only strictly after it has.
     */
    it("still reports blocked at the exact expiry instant, only allowing strictly after", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const limiter = new InMemoryRateLimiter();
        const key = uniqueKey();
        for (let i = 0; i < 11; i++) await limiter.checkAndRecord(key, 10, 900); // resetAt = 900_000, blocked

        vi.setSystemTime(900_000); // exactly at the boundary — not yet expired
        expect((await limiter.checkAndRecord(key, 10, 900)).allowed).toBe(false);

        vi.setSystemTime(900_001); // strictly past it
        expect((await limiter.checkAndRecord(key, 10, 900)).allowed).toBe(true);
    });

    it("starts a genuinely fresh window after real expiry — a full new run of hits blocks again", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const limiter = new InMemoryRateLimiter();
        const key = uniqueKey();
        for (let i = 0; i < 11; i++) await limiter.checkAndRecord(key, 10, 900); // blocked
        expect((await limiter.checkAndRecord(key, 10, 900)).allowed).toBe(false);

        vi.setSystemTime(900_001); // the window has now passed
        let last;
        for (let i = 0; i < 11; i++) last = await limiter.checkAndRecord(key, 10, 900); // a fresh run of 11 hits
        expect(last!.allowed).toBe(false); // must block again, not be stuck "expired" forever
    });
});

describe("UpstashRateLimiter", () => {
    /** Mimics the real INCR-and-EXPIRE Lua script: `expiryCalls` only increments when the counter goes from absent to 1. */
    function createMockRedis(): RedisCommands & { store: Map<string, number>; expiryCalls: number } {
        const store = new Map<string, number>();
        const mock = {
            store,
            expiryCalls: 0,
            async eval<TData>(_script: string, keys: string[], args: unknown[]): Promise<TData> {
                const [key] = keys;
                const next = (store.get(key) ?? 0) + 1;
                store.set(key, next);
                if (next === 1) {
                    mock.expiryCalls += 1;
                }
                return next as TData;
            },
            async ttl() {
                return 42;
            },
            async del(key: string) {
                const existed = store.has(key);
                store.delete(key);
                return existed ? 1 : 0;
            },
        };
        return mock;
    }

    it("allows requests up to the limit and blocks past it", async () => {
        const redis = createMockRedis();
        const limiter = new UpstashRateLimiter(redis);
        const key = uniqueKey();

        for (let i = 0; i < 5; i++) {
            expect((await limiter.checkAndRecord(key, 5, 60)).allowed).toBe(true);
        }
        const blocked = await limiter.checkAndRecord(key, 5, 60);
        expect(blocked.allowed).toBe(false);
        expect(blocked.retryAfterSeconds).toBe(42);
    });

    it("sets expiry only on the first increment, not every call", async () => {
        const redis = createMockRedis();
        const limiter = new UpstashRateLimiter(redis);
        const key = uniqueKey();

        await limiter.checkAndRecord(key, 5, 60);
        await limiter.checkAndRecord(key, 5, 60);
        await limiter.checkAndRecord(key, 5, 60);

        expect(redis.expiryCalls).toBe(1);
    });

    /** Asserts the mechanism itself (one `eval` call), not just the outcome — a regression back to separate
     * `incr`+`expire` calls would still pass the outcome-only tests above. */
    it("increments and sets expiry via a single atomic eval call, not separate commands", async () => {
        const redis = createMockRedis();
        const evalSpy = vi.spyOn(redis, "eval");
        const limiter = new UpstashRateLimiter(redis);
        const key = uniqueKey();

        await limiter.checkAndRecord(key, 5, 60);

        expect(evalSpy).toHaveBeenCalledTimes(1);
        expect(evalSpy).toHaveBeenCalledWith(expect.any(String), [key], [60]);
    });

    it("reset deletes the counter", async () => {
        const redis = createMockRedis();
        const limiter = new UpstashRateLimiter(redis);
        const key = uniqueKey();

        await limiter.checkAndRecord(key, 1, 60);
        await limiter.reset(key);
        expect(redis.store.has(key)).toBe(false);
        // A fresh window after reset — must be allowed again, not still counted.
        expect((await limiter.checkAndRecord(key, 1, 60)).allowed).toBe(true);
    });
});

describe("checkLoginRateLimit / resetLoginRateLimit (default limiter selection)", () => {
    beforeEach(() => {
        setRateLimiterForTesting(new InMemoryRateLimiter());
    });

    it("allows a key that has never been seen before", async () => {
        expect((await checkLoginRateLimit(uniqueKey())).allowed).toBe(true);
    });

    it("blocks after 5 attempts within the window", async () => {
        const key = uniqueKey();
        let last;
        for (let i = 0; i < 6; i++) last = await checkLoginRateLimit(key);
        expect(last!.allowed).toBe(false);
    });

    it("resetLoginRateLimit clears the block for that key", async () => {
        const key = uniqueKey();
        for (let i = 0; i < 6; i++) await checkLoginRateLimit(key);
        expect((await checkLoginRateLimit(key)).allowed).toBe(false);

        await resetLoginRateLimit(key);
        expect((await checkLoginRateLimit(key)).allowed).toBe(true);
    });

    it("tracks IP and account keys independently even for the same login attempt", async () => {
        const ip = `ip:${ uniqueKey() }`;
        const account = `account:${ uniqueKey() }`;
        for (let i = 0; i < 6; i++) await checkLoginRateLimit(ip);

        expect((await checkLoginRateLimit(ip)).allowed).toBe(false);
        expect((await checkLoginRateLimit(account)).allowed).toBe(true);
    });
});

describe("checkRateLimit (general-purpose entry point)", () => {
    beforeEach(() => {
        setRateLimiterForTesting(new InMemoryRateLimiter());
    });

    it("delegates straight to the configured limiter with the given limit/window", async () => {
        const key = uniqueKey();
        let last;
        for (let i = 0; i < 4; i++) last = await checkRateLimit(key, 3, 60);
        expect(last!.allowed).toBe(false);
    });
});

describe("getRateLimiter (env-based backend selection)", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        setRateLimiterForTesting(undefined);
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        setRateLimiterForTesting(undefined);
    });

    /**
     * Also verifies the credentials genuinely reached the underlying
     * `@upstash/redis` client (`.client.baseUrl`/`.client.headers` are that
     * library's own, real, inspectable config — not this codebase's
     * abstraction) — not just that SOME `UpstashRateLimiter` got
     * constructed. `instanceof` alone would still pass even if the actual
     * `url`/`token` were dropped on the way into `new Redis(...)`, which
     * would silently break every real rate-limit check at runtime (found
     * by mutation testing, not review).
     */
    it("selects UpstashRateLimiter when both credentials are configured, and wires the real url/token into it", () => {
        process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
        process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

        const limiter = getRateLimiter();
        expect(limiter).toBeInstanceOf(UpstashRateLimiter);

        const redisClient = (limiter as unknown as { redis: { client: { baseUrl: string; headers: Record<string, string> } } }).redis.client;
        expect(redisClient.baseUrl).toBe("https://example.upstash.io");
        expect(redisClient.headers.authorization).toBe("Bearer test-token");
    });

    it("does NOT select UpstashRateLimiter when only the URL is configured (token missing)", () => {
        process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        process.env.NODE_ENV = "test";

        expect(getRateLimiter()).not.toBeInstanceOf(UpstashRateLimiter);
    });

    it("does NOT select UpstashRateLimiter when only the token is configured (URL missing)", () => {
        delete process.env.UPSTASH_REDIS_REST_URL;
        process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
        process.env.NODE_ENV = "test";

        expect(getRateLimiter()).not.toBeInstanceOf(UpstashRateLimiter);
    });

    it("falls back to InMemoryRateLimiter outside production when credentials are absent", () => {
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        // Explicitly cleared, not left as whatever backend/.env.test set it
        // to — otherwise this test would keep passing even if the
        // NODE_ENV !== "production" check were mutated away entirely,
        // since the DISABLE_RATE_LIMIT escape hatch would independently
        // mask the difference. Found by mutation testing, not review.
        delete process.env.DISABLE_RATE_LIMIT;
        process.env.NODE_ENV = "test";

        expect(getRateLimiter()).toBeInstanceOf(InMemoryRateLimiter);
    });

    /**
     * The actual security property this exists to guarantee: a real
     * production deploy that forgot to set Upstash credentials must fail
     * loudly on its very first rate-limited request, not silently run
     * with per-process-only brute-force protection forever. A test that
     * only checked "some limiter got returned" would pass even if this
     * whole guard were deleted. Also pins the actual message content
     * (mentions both env var names), not just the error class — an ops
     * person reading this in a log needs to know WHICH vars to set.
     */
    it("throws RateLimiterMisconfiguredError in production when credentials are absent", () => {
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        delete process.env.DISABLE_RATE_LIMIT;
        process.env.NODE_ENV = "production";

        expect(() => getRateLimiter()).toThrow(RateLimiterMisconfiguredError);
        expect(() => getRateLimiter()).toThrow(/UPSTASH_REDIS_REST_URL.*UPSTASH_REDIS_REST_TOKEN/);
    });

    it("does NOT throw in production when DISABLE_RATE_LIMIT is set (the E2E-suite escape hatch)", () => {
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        process.env.NODE_ENV = "production";
        process.env.DISABLE_RATE_LIMIT = "true";

        expect(getRateLimiter()).toBeInstanceOf(InMemoryRateLimiter);
    });
});

describe("checkRateLimit / checkLoginRateLimit resilience against a failing configured backend", () => {
    afterEach(() => {
        setRateLimiterForTesting(undefined);
        setFallbackLimiterForTesting(undefined);
    });

    function makeThrowingLimiter(error: Error): RateLimiter {
        return {
            checkAndRecord: () => Promise.reject(error),
            reset: () => Promise.reject(error),
        };
    }

    it("falls back to an in-memory limiter (does not reject/500) when the configured backend's checkAndRecord throws, and logs a diagnostic mentioning the fallback", async () => {
        setRateLimiterForTesting(makeThrowingLimiter(new Error("ECONNREFUSED")));
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        try {
            const result = await checkRateLimit(uniqueKey(), 5, 60);
            expect(result.allowed).toBe(true);
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("falling back"), expect.any(Error));
        } finally {
            errorSpy.mockRestore();
        }
    });

    /**
     * Not just "one call recovers" — the fallback must be a real, shared
     * counter across calls (this process's fallback singleton), or the
     * degraded protection during an outage would be no protection at all
     * (every call getting a fresh, empty bucket that never blocks
     * anything).
     */
    it("the fallback limiter genuinely accumulates state across calls, not a fresh instance every time", async () => {
        setRateLimiterForTesting(makeThrowingLimiter(new Error("ECONNREFUSED")));
        const key = uniqueKey();

        let last;
        for (let i = 0; i < 6; i++) last = await checkRateLimit(key, 5, 60);
        expect(last!.allowed).toBe(false);
    });

    it("re-throws a RateLimiterMisconfiguredError instead of silently absorbing it into the fallback", async () => {
        setRateLimiterForTesting(makeThrowingLimiter(new RateLimiterMisconfiguredError("no creds configured")));

        await expect(checkRateLimit(uniqueKey(), 5, 60)).rejects.toThrow(RateLimiterMisconfiguredError);
    });

    it("checkLoginRateLimit gets the same fallback resilience as checkRateLimit", async () => {
        setRateLimiterForTesting(makeThrowingLimiter(new Error("ECONNREFUSED")));

        const result = await checkLoginRateLimit(uniqueKey());
        expect(result.allowed).toBe(true);
    });

    /**
     * Proves `setFallbackLimiterForTesting` actually wires its argument
     * INTO the fallback path, rather than being a no-op that happens not
     * to matter because every other test here uses a fresh key anyway
     * (found by mutation testing — emptying this setter's body survived
     * every other test in this file). Pre-loads an injected limiter past
     * its own limit BEFORE the configured backend ever fails, then asserts
     * the very first fallback hit is already blocked — only possible if
     * `checkAndRecordResilient` is really reaching into THIS SAME
     * instance, not a fresh internal one.
     */
    it("setFallbackLimiterForTesting's injected instance is the one actually used on fallback", async () => {
        const injectedFallback = new InMemoryRateLimiter();
        const key = uniqueKey();
        await injectedFallback.checkAndRecord(key, 1, 60); // pre-exhausts the limit of 1
        setFallbackLimiterForTesting(injectedFallback);
        setRateLimiterForTesting(makeThrowingLimiter(new Error("ECONNREFUSED")));

        const result = await checkRateLimit(key, 1, 60);
        expect(result.allowed).toBe(false);
    });
});

describe("resetLoginRateLimit swallowing a failing configured backend", () => {
    afterEach(() => {
        setRateLimiterForTesting(undefined);
    });

    /**
     * The real bug this guards against: login/route.ts calls this AFTER
     * a successful login, inside a try/catch that turns any thrown error
     * into an error RESPONSE — an unhandled rejection here used to turn a
     * genuinely correct login into a 500 for the admin purely because the
     * rate-limit backend was unreachable.
     */
    it("resolves normally even when the configured backend's reset() rejects, and logs a diagnostic instead of losing the failure silently", async () => {
        setRateLimiterForTesting({
            checkAndRecord: async () => ({ allowed: true }),
            reset: () => Promise.reject(new Error("ECONNREFUSED")),
        });
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        try {
            await expect(resetLoginRateLimit(uniqueKey())).resolves.toBeUndefined();
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("resetting a login counter"), expect.any(Error));
        } finally {
            errorSpy.mockRestore();
        }
    });
});
