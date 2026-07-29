import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { InMemoryRateLimiter, setRateLimiterForTesting } from "@portfolio/backend/edge";
import { proxy } from "./proxy";

function makeRequest(
    path: string,
    options: { ip?: string; prefetch?: boolean; accept?: string } = {},
): NextRequest {
    const headers = new Headers();
    headers.set("x-forwarded-for", options.ip ?? "203.0.113.1");
    if (options.prefetch) {
        headers.set("next-router-prefetch", "1");
    }
    if (options.accept) {
        headers.set("accept", options.accept);
    }
    return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

const HTML_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

describe("proxy — rate limiting", () => {
    beforeEach(() => {
        setRateLimiterForTesting(new InMemoryRateLimiter());
    });

    afterEach(() => {
        setRateLimiterForTesting(undefined);
    });

    /**
     * Pins the actual bug this was found for: the e2e visual suite tripped
     * the global limit on Next.js's own background <Link> prefetches, not
     * real navigations. Exhausts the global budget with real navigations
     * first, then proves a prefetch request from the SAME IP still goes
     * through — if prefetches shared `global`'s bucket (the old behavior),
     * this would 429 too.
     */
    it("does not let real navigations exhaust a prefetch request's budget", async () => {
        const ip = "203.0.113.5";
        const GLOBAL_LIMIT = 300;

        let lastRealNav;
        for (let i = 0; i < GLOBAL_LIMIT; i++) {
            lastRealNav = await proxy(makeRequest("/journal", { ip }));
        }
        expect(lastRealNav!.status).not.toBe(429);

        const oneOverLimit = await proxy(makeRequest("/journal", { ip }));
        expect(oneOverLimit.status).toBe(429);

        const prefetch = await proxy(makeRequest("/journal", { ip, prefetch: true }));
        expect(prefetch.status).not.toBe(429);
    });

    it("still rate-limits prefetch requests once THEIR OWN (higher) budget is exhausted", async () => {
        const ip = "203.0.113.9";
        const PREFETCH_LIMIT = 900;

        let lastAllowed;
        for (let i = 0; i < PREFETCH_LIMIT; i++) {
            lastAllowed = await proxy(makeRequest("/journal", { ip, prefetch: true }));
        }
        expect(lastAllowed!.status).not.toBe(429);

        const oneOverLimit = await proxy(makeRequest("/journal", { ip, prefetch: true }));
        expect(oneOverLimit.status).toBe(429);
    });

    it("keeps prefetch and real-navigation counters independent per IP", async () => {
        const ip = "203.0.113.20";

        const real = await proxy(makeRequest("/work", { ip }));
        const prefetch = await proxy(makeRequest("/work", { ip, prefetch: true }));

        expect(real.status).not.toBe(429);
        expect(prefetch.status).not.toBe(429);
    });
});

/**
 * See `enforceRateLimit`'s own comment for the reasoning: a real browser
 * navigation gets bounced to the fun `/error/429` page; every other
 * caller (API clients, prefetches) keeps the exact JSON contract the
 * suite above already pins.
 */
describe("proxy — rate limiting redirects real navigations to the fun /error/429 page", () => {
    const GLOBAL_LIMIT = 300;

    beforeEach(() => {
        setRateLimiterForTesting(new InMemoryRateLimiter());
    });

    afterEach(() => {
        setRateLimiterForTesting(undefined);
    });

    async function exhaustGlobalBudget(path: string, ip: string, accept?: string): Promise<Response> {
        let last: Response | undefined;
        for (let i = 0; i < GLOBAL_LIMIT; i++) {
            last = await proxy(makeRequest(path, { ip, accept }));
        }
        expect(last!.status).not.toBe(429);
        return proxy(makeRequest(path, { ip, accept }));
    }

    it("redirects an over-budget HTML navigation to /error/429 with the real Retry-After folded into the query string", async () => {
        const blocked = await exhaustGlobalBudget("/journal", "203.0.113.30", HTML_ACCEPT);

        expect(blocked.status).toBe(307);
        const location = new URL(blocked.headers.get("location")!);
        expect(location.pathname).toBe("/error/429");
        // Not a hardcoded literal — the in-memory limiter computes this from
        // wall-clock time remaining in the window (GLOBAL_WINDOW_SECONDS =
        // 5 minutes), so pin "a real positive number, at most the window
        // size" rather than an exact value that would make this test flaky
        // under slow CI.
        const retryAfter = Number(location.searchParams.get("retryAfter"));
        expect(retryAfter).toBeGreaterThan(0);
        expect(retryAfter).toBeLessThanOrEqual(5 * 60);
    });

    it("preserves a Russian navigation's /ru prefix in the redirect target", async () => {
        const blocked = await exhaustGlobalBudget("/ru/journal", "203.0.113.31", HTML_ACCEPT);

        expect(blocked.status).toBe(307);
        expect(new URL(blocked.headers.get("location")!).pathname).toBe("/ru/error/429");
    });

    it("keeps the plain JSON contract for /api/* requests, even ones that happen to send an HTML Accept header", async () => {
        const blocked = await exhaustGlobalBudget("/api/something", "203.0.113.32", HTML_ACCEPT);

        expect(blocked.status).toBe(429);
        expect(blocked.headers.get("location")).toBeNull();
        await expect(blocked.json()).resolves.toEqual({ error: "Too many requests." });
    });

    it("keeps the plain JSON contract for background prefetches, even ones that happen to send an HTML Accept header", async () => {
        const ip = "203.0.113.33";
        const PREFETCH_LIMIT = 900;

        let last: Response | undefined;
        for (let i = 0; i < PREFETCH_LIMIT; i++) {
            last = await proxy(makeRequest("/journal", { ip, prefetch: true, accept: HTML_ACCEPT }));
        }
        expect(last!.status).not.toBe(429);

        const blocked = await proxy(makeRequest("/journal", { ip, prefetch: true, accept: HTML_ACCEPT }));
        expect(blocked.status).toBe(429);
        expect(blocked.headers.get("location")).toBeNull();
    });

    it("keeps returning plain JSON for a request with no Accept header at all (matches every pre-existing test above)", async () => {
        const blocked = await exhaustGlobalBudget("/journal", "203.0.113.34");

        expect(blocked.status).toBe(429);
        expect(blocked.headers.get("location")).toBeNull();
    });

    it("exempts /error/429 itself from rate limiting, so the redirect destination can never loop back into another redirect", async () => {
        const ip = "203.0.113.35";

        // Same IP hammers the fun page far past what would normally block it.
        let last: Response | undefined;
        for (let i = 0; i < GLOBAL_LIMIT + 5; i++) {
            last = await proxy(makeRequest("/error/429", { ip, accept: HTML_ACCEPT }));
        }
        expect(last!.status).not.toBe(429);
        expect(last!.status).not.toBe(307);
    });
});
