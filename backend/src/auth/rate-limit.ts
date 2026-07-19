const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 10;

interface Bucket {
    failedCount: number;
    resetAt: number;
}

/**
 * Interim brute-force defense for /api/auth/login, keyed by client IP.
 * In-memory on purpose: this app runs as ONE long-lived Node process on the
 * VPS (see web/README.md's single-process decision), not serverless
 * functions that reset per-request, so a plain Map genuinely persists
 * across requests for as long as the process is up. This is explicitly an
 * interim layer, not the final word — Phase 6 of the migration plan adds
 * nginx `limit_req` in front of it, which survives an app restart and
 * would also catch traffic this in-memory counter can't see if the app is
 * ever scaled to more than one process.
 */
const buckets = new Map<string, Bucket>();

export interface RateLimitCheck {
    allowed: boolean;
    retryAfterSeconds?: number;
}

export function checkLoginRateLimit(key: string): RateLimitCheck {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
        return {allowed: true};
    }

    if (bucket.failedCount >= MAX_FAILED_ATTEMPTS) {
        return {allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000)};
    }

    return {allowed: true};
}

/** Call after a failed login attempt for this key. */
export function recordFailedLogin(key: string): void {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
        buckets.set(key, {failedCount: 1, resetAt: now + WINDOW_MS});
        return;
    }

    bucket.failedCount += 1;
}

/** Call after a successful login so a few earlier typos don't linger against the count. */
export function resetLoginRateLimit(key: string): void {
    buckets.delete(key);
}
