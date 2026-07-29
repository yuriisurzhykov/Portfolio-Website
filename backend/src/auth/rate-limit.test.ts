import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    checkLoginRateLimit,
    checkRateLimit,
    InMemoryRateLimiter,
    resetLoginRateLimit,
    setRateLimiterForTesting,
    UpstashRateLimiter,
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
