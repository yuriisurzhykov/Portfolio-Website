import { describe, expect, it } from "vitest";
import { checkLoginRateLimit, recordFailedLogin, resetLoginRateLimit } from "./rate-limit";

/**
 * The limiter's buckets live in a module-level Map with no exported way to
 * reset it, so each test uses its own unique key (crypto-random suffix) —
 * that's simpler and safer than trying to reset shared module state
 * between tests, and just as valid: the limiter is keyed by client IP in
 * production, so per-test isolation via a unique key mirrors that exactly.
 */
function uniqueKey(): string {
    return `test-${ Math.random().toString(36).slice(2) }`;
}

describe("rate-limit", () => {
    it("allows a key that has never been seen before", () => {
        expect(checkLoginRateLimit(uniqueKey()).allowed).toBe(true);
    });

    it("still allows requests below the failure threshold", () => {
        const key = uniqueKey();
        for (let i = 0; i < 9; i++) recordFailedLogin(key);
        expect(checkLoginRateLimit(key).allowed).toBe(true);
    });

    it("blocks once the failure threshold is reached", () => {
        const key = uniqueKey();
        for (let i = 0; i < 10; i++) recordFailedLogin(key);
        const result = checkLoginRateLimit(key);
        expect(result.allowed).toBe(false);
        expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("resetLoginRateLimit clears the block for that key", () => {
        const key = uniqueKey();
        for (let i = 0; i < 10; i++) recordFailedLogin(key);
        expect(checkLoginRateLimit(key).allowed).toBe(false);

        resetLoginRateLimit(key);
        expect(checkLoginRateLimit(key).allowed).toBe(true);
    });

    it("tracks different keys independently", () => {
        const keyA = uniqueKey();
        const keyB = uniqueKey();
        for (let i = 0; i < 10; i++) recordFailedLogin(keyA);

        expect(checkLoginRateLimit(keyA).allowed).toBe(false);
        expect(checkLoginRateLimit(keyB).allowed).toBe(true);
    });
});
