import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { InMemoryRateLimiter, setRateLimiterForTesting } from "@portfolio/backend/edge";
import { proxy } from "./proxy";

function makeRequest(
    path: string,
    options: { ip?: string; prefetch?: boolean; accept?: string; rsc?: boolean; forwardedProto?: string } = {},
): NextRequest {
    const headers = new Headers();
    headers.set("x-forwarded-for", options.ip ?? "203.0.113.1");
    if (options.prefetch) {
        headers.set("next-router-prefetch", "1");
    }
    if (options.accept) {
        headers.set("accept", options.accept);
    }
    if (options.rsc) {
        headers.set("rsc", "1");
    }
    // Real deployments (behind nginx) run over `X-Forwarded-Proto: https`,
    // and by the time a request reaches middleware, Next.js's own server
    // has ALREADY folded that into `request.nextUrl.protocol` itself (see
    // the "forces the rewrite target's protocol to http" regression test
    // below) — setting the header alone on a `NextRequest` built here does
    // NOT reproduce that, since this constructor doesn't re-derive
    // `nextUrl` from headers the way the real server pipeline does. The
    // base URL's own scheme is what actually stands in for "the protocol
    // middleware sees on `request.nextUrl`" in this test harness.
    if (options.forwardedProto) {
        headers.set("x-forwarded-proto", options.forwardedProto);
    }
    const scheme = options.forwardedProto === "https" ? "https" : "http";
    return new NextRequest(new URL(path, `${ scheme }://localhost:3000`), { headers });
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
     *
     * CAVEAT, found later (see `enforceRateLimit`'s own comment on
     * `isPrefetch` for the full story, verified with a live header dump
     * against a real `next dev`/`next start` server): the
     * `next-router-prefetch` header this test sets on `makeRequest()` is
     * real and does reach `isPrefetch`'s check HERE, because this test
     * constructs a `NextRequest` directly and calls `proxy()` in
     * isolation — but Next.js's own server strips that exact header
     * before a REAL deployed request ever reaches this function. This
     * test still correctly proves the function's OWN branching logic is
     * right; it does NOT prove prefetch traffic is actually separated
     * from real navigations in production today (it currently isn't).
     */
    it("does not let real navigations exhaust a prefetch request's budget", async () => {
        const ip = "203.0.113.5";
        const GLOBAL_LIMIT = 300;

        let lastRealNav;
        for (let i = 0; i < GLOBAL_LIMIT; i++) {
            lastRealNav = await proxy(makeRequest("/journal", { ip }));
        }
        expect(lastRealNav!.status).not.toBe(429);
        expect(lastRealNav!.status).not.toBe(307);

        // A blocked real navigation redirects (307), not a bare 429 — see
        // the dedicated describe block below for the full story on why.
        const oneOverLimit = await proxy(makeRequest("/journal", { ip }));
        expect(oneOverLimit.status).toBe(307);

        const prefetch = await proxy(makeRequest("/journal", { ip, prefetch: true }));
        expect(prefetch.status).not.toBe(429);
        expect(prefetch.status).not.toBe(307);
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

    async function exhaustGlobalBudget(
        path: string,
        ip: string,
        options: { accept?: string; rsc?: boolean } = {},
    ): Promise<Response> {
        let last: Response | undefined;
        for (let i = 0; i < GLOBAL_LIMIT; i++) {
            last = await proxy(makeRequest(path, { ip, ...options }));
        }
        expect(last!.status).not.toBe(429);
        return proxy(makeRequest(path, { ip, ...options }));
    }

    it("redirects an over-budget HTML navigation to /error/429 with the real Retry-After folded into the query string", async () => {
        const blocked = await exhaustGlobalBudget("/journal", "203.0.113.30", { accept: HTML_ACCEPT });

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

    /**
     * Regression test for a real bug (flagged by review): without `from`,
     * `/error/429`'s "Try again" button had nothing to retry but ITSELF —
     * an exempt route that can never re-trip a check that would send the
     * visitor onward — so it stayed broken even after the real rate limit
     * expired. The redirect must carry the ORIGINAL blocked destination,
     * query string included (`/journal?page=2`, not just `/journal`).
     */
    it("carries the original blocked destination (path + query string) as `from`, for the retry button to navigate back to", async () => {
        const blocked = await exhaustGlobalBudget("/journal?page=2", "203.0.113.37", { accept: HTML_ACCEPT });

        const location = new URL(blocked.headers.get("location")!);
        expect(location.searchParams.get("from")).toBe("/journal?page=2");
    });

    /**
     * Regression test for a real bug (found via a live Playwright network
     * capture of an actual <Link> click, not assumed): a client-side App
     * Router navigation fetches the RSC payload with a wildcard Accept
     * header, not `text/html` — an earlier version of this check
     * redirected only on `Accept: text/html`, so a visitor clicking a
     * link while already rate-limited fell through to the JSON branch
     * instead of `/error/429`, and the client router would have tried
     * (and failed) to parse that JSON body as an RSC payload. (An
     * `rsc: 1` header would be the more precise signal for "this is an
     * RSC navigation," but a live header dump proved Next.js strips it
     * before this function ever sees it — see `enforceRateLimit`'s own
     * comment — so this asserts the ACTUAL fix: no Accept header at all
     * still redirects, because the check no longer depends on Accept.)
     */
    it("redirects a real (non-prefetch) client-side <Link> navigation — wildcard Accept, no rsc header reaching this function", async () => {
        const blocked = await exhaustGlobalBudget("/journal", "203.0.113.36", { accept: "*/*" });

        expect(blocked.status).toBe(307);
        expect(new URL(blocked.headers.get("location")!).pathname).toBe("/error/429");
    });

    it("preserves a Russian navigation's /ru prefix in both the redirect target and the from destination", async () => {
        const blocked = await exhaustGlobalBudget("/ru/journal", "203.0.113.31", { accept: HTML_ACCEPT });

        expect(blocked.status).toBe(307);
        const location = new URL(blocked.headers.get("location")!);
        expect(location.pathname).toBe("/ru/error/429");
        // The retry target must ALSO keep the /ru prefix — retrying
        // should land back on the Russian page, not silently switch the
        // visitor to English.
        expect(location.searchParams.get("from")).toBe("/ru/journal");
    });

    it("keeps the plain JSON contract for /api/* requests, even ones that happen to send an HTML Accept header", async () => {
        const blocked = await exhaustGlobalBudget("/api/something", "203.0.113.32", { accept: HTML_ACCEPT });

        expect(blocked.status).toBe(429);
        expect(blocked.headers.get("location")).toBeNull();
        await expect(blocked.json()).resolves.toEqual({ error: "Too many requests." });
    });

    /**
     * As with the top `describe` block's own prefetch test: this proves
     * `enforceRateLimit` correctly keeps a *declared* prefetch on the
     * JSON branch — it does NOT prove real prefetch traffic is
     * distinguishable in production, since `next-router-prefetch` (set
     * here via `makeRequest`) never actually reaches this function on a
     * real deployed request (see `enforceRateLimit`'s `isPrefetch`
     * comment).
     */
    it("keeps the plain JSON contract for a declared prefetch, even one that also carries an HTML Accept header", async () => {
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

    /**
     * The other side of the regression test above: since this app can't
     * reliably tell a real RSC navigation apart from a plain request with
     * no special headers at all (a raw `curl`, for instance), it
     * deliberately treats them the same — redirected, not JSON — for any
     * non-API, non-prefetch-flagged path. See `wantsRedirect`'s own
     * comment in proxy.ts for why that's the more correct call anyway.
     */
    it("redirects even a request with no Accept header at all, as long as it isn't /api/* or a declared prefetch", async () => {
        const blocked = await exhaustGlobalBudget("/journal", "203.0.113.34");

        expect(blocked.status).toBe(307);
        expect(new URL(blocked.headers.get("location")!).pathname).toBe("/error/429");
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

/**
 * Regression test for a real bug, reproduced live: running the full
 * Playwright visual/a11y suite (`npm run test:e2e`) reliably hung for 60s
 * on `waitForLoadState("networkidle")` on a link-heavy page (`/work`) once
 * the suite's own traffic (44 tests x Next's automatic <Link> prefetching)
 * exhausted the shared `global` budget — every subsequent prefetch then got
 * a real redirect response instead of a harmless-to-ignore JSON 429, and
 * Next's router kept retrying/following those. `DISABLE_RATE_LIMIT` is the
 * fix, set only in `backend/.env.test` / CI workflow env — never in dev or
 * prod (see `enforceRateLimit`'s own comment on it).
 */
describe("proxy — DISABLE_RATE_LIMIT (Playwright suite escape hatch)", () => {
    const GLOBAL_LIMIT = 300;

    beforeEach(() => {
        setRateLimiterForTesting(new InMemoryRateLimiter());
    });

    afterEach(() => {
        setRateLimiterForTesting(undefined);
        vi.unstubAllEnvs();
    });

    it("bypasses rate limiting entirely when set to the exact string \"true\"", async () => {
        vi.stubEnv("DISABLE_RATE_LIMIT", "true");
        const ip = "203.0.113.40";

        let last: Response | undefined;
        // Deliberately WAY past the normal limit — if the bypass didn't
        // work, this would already be redirecting/erroring well before
        // the loop finishes.
        for (let i = 0; i < GLOBAL_LIMIT * 3; i++) {
            last = await proxy(makeRequest("/journal", { ip }));
        }

        expect(last!.status).not.toBe(429);
        expect(last!.status).not.toBe(307);
    });

    it("does NOT bypass rate limiting when the variable is unset (the real dev/prod default)", async () => {
        const ip = "203.0.113.41";

        let last: Response | undefined;
        for (let i = 0; i < GLOBAL_LIMIT; i++) {
            last = await proxy(makeRequest("/journal", { ip }));
        }
        expect(last!.status).not.toBe(429);

        const oneOverLimit = await proxy(makeRequest("/journal", { ip }));
        expect(oneOverLimit.status).toBe(307);
    });

    it("requires the exact string \"true\" — a near-miss value like \"1\" does NOT accidentally grant the bypass", async () => {
        vi.stubEnv("DISABLE_RATE_LIMIT", "1");
        const ip = "203.0.113.42";

        let last: Response | undefined;
        for (let i = 0; i < GLOBAL_LIMIT; i++) {
            last = await proxy(makeRequest("/journal", { ip }));
        }
        expect(last!.status).not.toBe(429);

        const oneOverLimit = await proxy(makeRequest("/journal", { ip }));
        expect(oneOverLimit.status).toBe(307);
    });
});

/**
 * Nothing pinned this before, and it had already broken silently once:
 * every `/ru/...` URL rendered in English under a production build because
 * the proxy runs a SECOND time on its own rewrite target and re-resolved
 * the locale from the (now unprefixed) path.
 *
 * `x-middleware-rewrite` and `x-middleware-request-*` are how Next.js
 * transports a rewrite target and mutated request headers out of
 * middleware. Asserting on them is reaching into a transport detail, and
 * it is the only way to observe this function's actual output without a
 * running server — the e2e suite covers the same behavior end-to-end
 * (`seo.spec.ts`: `<html lang>`, canonical, `og:locale`).
 */
describe("proxy — locale resolution", () => {
    beforeEach(() => {
        vi.stubEnv("DISABLE_RATE_LIMIT", "true");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    function resolvedLocale(response: Response): string | null {
        return response.headers.get("x-middleware-request-x-locale");
    }

    function rewriteTarget(response: Response): URL | null {
        const value = response.headers.get("x-middleware-rewrite");
        return value ? new URL(value, "http://localhost:3000") : null;
    }

    it("rewrites /ru/... to the unprefixed route and carries the locale IN THE URL", async () => {
        const target = rewriteTarget(await proxy(makeRequest("/ru/journal/my-post")));

        expect(target?.pathname).toBe("/journal/my-post");
        // In the URL, not only in a header: a cache keys on the URL, so
        // this is what makes the response a pure function of its address.
        expect(target?.searchParams.get("__locale")).toBe("ru");
    });

    it("keeps the site root as / when rewriting /ru", async () => {
        expect(rewriteTarget(await proxy(makeRequest("/ru")))?.pathname).toBe("/");
    });

    it("preserves a page's own query string across the rewrite", async () => {
        const target = rewriteTarget(await proxy(makeRequest("/ru/work?tech=kotlin")));

        expect(target?.searchParams.get("tech")).toBe("kotlin");
        expect(target?.searchParams.get("__locale")).toBe("ru");
    });

    it("resolves \"ru\" on the SECOND pass, which sees the rewritten URL with no /ru prefix", async () => {
        // The exact scenario that regressed: this is what Next.js hands
        // back to the proxy after its own rewrite.
        expect(resolvedLocale(await proxy(makeRequest("/journal/my-post?__locale=ru")))).toBe("ru");
    });

    it("resolves \"en\" for an ordinary unprefixed URL", async () => {
        expect(resolvedLocale(await proxy(makeRequest("/journal/my-post")))).toBe("en");
    });

    /**
     * Regression test for a real production outage (vercel/next.js#94745):
     * behind nginx, an incoming request carries `X-Forwarded-Proto: https`
     * even though this app's own server only ever speaks plain HTTP (TLS
     * terminates at nginx) — `request.nextUrl.clone()` copies that "https"
     * straight into the rewrite target, and Next.js's own loopback-hostname
     * normalization bug then treats the rewrite as external and self-proxies
     * it, attempting a real TLS handshake against the plain-HTTP port
     * ("EPROTO ... wrong version number") and 500ing every single /ru
     * request. Reproduced live against a real `next build && next start -H
     * 127.0.0.1` with this exact spoofed header before being fixed by
     * forcing the rewrite's own protocol to "http:" — see `handleLocale`'s
     * comment. Every other test in this file constructs requests without
     * `x-forwarded-proto`, so none of them would have caught this.
     */
    it("forces the rewrite target's protocol to http, even when the original request arrived over a forwarded https connection", async () => {
        const target = rewriteTarget(
            await proxy(makeRequest("/ru/journal/my-post", { forwardedProto: "https" })),
        );

        expect(target?.protocol).toBe("http:");
        expect(target?.pathname).toBe("/journal/my-post");
    });

    it("IGNORES a client-supplied x-locale header — it is an output of this function, never an input", async () => {
        // Trusting it would be harmless while the app is served directly,
        // and would become cache poisoning behind any shared cache: nginx
        // and CDNs key on the URL alone, so one forged header could store
        // a Russian response under the English URL for everyone.
        const request = makeRequest("/journal/my-post");
        request.headers.set("x-locale", "ru");

        expect(resolvedLocale(await proxy(request))).toBe("en");
    });
});
