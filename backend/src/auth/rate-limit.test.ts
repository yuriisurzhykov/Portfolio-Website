import { afterEach, describe, expect, it, vi } from "vitest";
import { checkLoginRateLimit, recordFailedLogin, resetLoginRateLimit } from "./rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

afterEach(() => {
    vi.useRealTimers();
});

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

    /**
     * Found by mutation testing: "blocks once the threshold is reached"
     * only asserted `retryAfterSeconds > 0`, which can't distinguish the
     * real 15-minute window from a wrong arithmetic mistake (e.g. adding
     * instead of subtracting, or multiplying instead of dividing by 1000).
     * `now` is deliberately NOT left at 0: `resetAt - now` and
     * `resetAt + now` happen to produce the same result when `now` is 0,
     * which would make the test pass against the wrong formula too.
     */
    it("computes retryAfterSeconds precisely from the real 15-minute window, not just as some positive number", () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const key = uniqueKey();
        for (let i = 0; i < 10; i++) recordFailedLogin(key); // resetAt = WINDOW_MS

        vi.setSystemTime(1000); // 1 real second later
        expect(checkLoginRateLimit(key).retryAfterSeconds).toBe(15 * 60 - 1);
    });

    /**
     * Found by mutation testing: nothing tested the exact expiry boundary,
     * so a mutant changing `resetAt < now` to `resetAt <= now` survived —
     * both versions agree everywhere except the single instant they're
     * equal. Below only pins the reader-side check (`checkLoginRateLimit`);
     * the writer-side check has its own boundary test below.
     */
    it("checkLoginRateLimit still reports blocked at the exact expiry instant, only allowing strictly after", () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const key = uniqueKey();
        for (let i = 0; i < 10; i++) recordFailedLogin(key); // resetAt = WINDOW_MS

        vi.setSystemTime(WINDOW_MS); // exactly at the boundary — not yet expired
        expect(checkLoginRateLimit(key).allowed).toBe(false);

        vi.setSystemTime(WINDOW_MS + 1); // strictly past it
        expect(checkLoginRateLimit(key).allowed).toBe(true);
    });

    it("recordFailedLogin only resets the counter strictly after the window passes, not exactly at the boundary", () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const key = uniqueKey();
        for (let i = 0; i < 10; i++) recordFailedLogin(key); // resetAt = WINDOW_MS

        vi.setSystemTime(WINDOW_MS); // exactly at the boundary — not yet expired
        recordFailedLogin(key); // must increment the existing bucket (11), not start a fresh one
        expect(checkLoginRateLimit(key).allowed).toBe(false);
    });

    /**
     * Found by mutation testing: the previous boundary test alone doesn't
     * prove `recordFailedLogin` actually WRITES a fresh, future `resetAt` —
     * `checkLoginRateLimit` has its own independent expiry check, which
     * would keep reporting "allowed" for a stale, never-updated `resetAt`
     * regardless of what `recordFailedLogin` did internally, masking a
     * mutant that made `recordFailedLogin` stop resetting altogether. The
     * real, only-observable-this-way symptom of that bug: once expired
     * once, the key could NEVER be blocked again, no matter how many more
     * failures come in — a full fresh run of failures must still block.
     */
    it("starts a genuinely fresh window after expiry — a full new run of failures blocks again", () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const key = uniqueKey();
        for (let i = 0; i < 10; i++) recordFailedLogin(key); // resetAt = WINDOW_MS
        expect(checkLoginRateLimit(key).allowed).toBe(false);

        vi.setSystemTime(WINDOW_MS + 1); // the window has now passed
        for (let i = 0; i < 10; i++) recordFailedLogin(key); // a fresh run of 10 failures
        expect(checkLoginRateLimit(key).allowed).toBe(false); // must block again, not be stuck "expired" forever
    });
});
