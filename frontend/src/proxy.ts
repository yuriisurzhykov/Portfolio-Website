import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@portfolio/backend/edge";
import { LOCALE_HEADER, RU_PREFIX } from "@/shared/lib/locale-constants";
import { REQUEST_PATHNAME_HEADER } from "@/shared/lib/auth/constants";
import { getClientIp } from "@/shared/lib/client-ip";

export const config = {
    matcher: [
        // Every route except Next.js internals, the favicon, and any
        // request for a file with an extension (images, etc. — those never
        // carry a locale prefix and don't need rate-limit bookkeeping
        // either). Deliberately ONE pattern, not split by admin/api/public
        // — see this file's top comment for why this file no longer needs
        // to treat those differently.
        "/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)",
    ],
};

const GLOBAL_LIMIT = 300;
const GLOBAL_WINDOW_SECONDS = 5 * 60;
// 3x GLOBAL_LIMIT, same window — see `enforceRateLimit`'s own comment on
// why background prefetches get their own, more generous tier instead of
// sharing `global`'s budget with real navigations.
const PREFETCH_LIMIT = 900;
const PREFETCH_WINDOW_SECONDS = 5 * 60;
const REFRESH_LIMIT = 30;
const REFRESH_WINDOW_SECONDS = 10 * 60;
const ADMIN_MUTATION_LIMIT = 120;
const ADMIN_MUTATION_WINDOW_SECONDS = 60;

/**
 * `proxy.ts` (Next.js 16's rename of `middleware.ts`/`export function
 * middleware`, see `frontend/README.md`'s journal entry) — deliberately narrow.
 *
 * Two, and only two, jobs live here now:
 * 1. IP-based rate limiting (below) — a genuinely cross-cutting concern
 *    that applies uniformly to every route regardless of what it does, the
 *    kind of coarse, path-shape-only decision Edge middleware is actually
 *    good at (see `backend/src/auth/README.md`'s rate-limiter entry for
 *    the concrete tiers/thresholds and why).
 * 2. Locale rewrite for the public site (`handleLocale`, unchanged).
 *
 * What USED to live here — deciding whether a request is even allowed to
 * reach `/admin/*`/`/api/admin/*` — does NOT anymore. That decision moved
 * to `defineAdminRoute`/`requirePage`
 * (`frontend/src/shared/lib/auth/guard.ts`), declared right next to each
 * route/page it protects. Reasoning: middleware runs before Next.js even
 * resolves which `route.ts`/`page.tsx` will handle a request, so the only
 * thing it can ever judge is the URL's shape — it fundamentally cannot ask
 * "what does THIS specific handler require," only "does this path look
 * like /admin." That's an authentication check (is there a token at all),
 * not the finer authorization decision handlers now make for themselves.
 * See `backend/src/auth/README.md` for the fuller writeup of this split.
 *
 * The one thing this file still does for `/admin`/`/api` requests is stamp
 * the current pathname onto a header (`withPathnameHeader`) — not an
 * authorization signal, just a UX convenience so `requirePage()` can build
 * a `?from=<path>` redirect after bouncing to `/admin/login` (Next.js
 * gives Server Components no other way to read the current pathname).
 */
export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const rateLimited = await enforceRateLimit(request, pathname);
    if (rateLimited) {
        return rateLimited;
    }

    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
        return withPathnameHeader(request, pathname);
    }

    return handleLocale(request, pathname);
}

async function enforceRateLimit(request: NextRequest, pathname: string): Promise<NextResponse | null> {
    // Explicit opt-out for the Playwright visual/a11y suite ONLY — set via
    // `backend/.env.test` (loaded by `playwright.config.ts` and inherited
    // by the `next build && next start` process it spawns as `webServer`;
    // never set in dev or prod). Found live: running the FULL suite
    // (`npm run test:e2e`, 44 tests × Next's own automatic <Link>
    // prefetching of every visible link) reliably exhausted the shared
    // `global` budget partway through — and, since `isPrefetch` can't
    // actually distinguish a prefetch from a real navigation here (see
    // the comment on it below), EVERY subsequent prefetch on a
    // link-heavy page (e.g. `/work`) then got a real redirect response
    // instead of the harmless-to-ignore JSON 429 it used to get. Next's
    // router kept retrying/following those, and `waitForLoadState
    // ("networkidle")` in `visual.spec.ts` never saw a quiet window —
    // observed as a flat 60s test timeout, not a screenshot mismatch.
    // Rate limiting itself already has its own dedicated, fast unit
    // suite (`proxy.test.ts`) that doesn't need a real server at all;
    // exercising it AGAIN under a real browser here would only add
    // flakiness to a suite whose actual job is visual/accessibility
    // regressions, not abuse protection.
    if (process.env.DISABLE_RATE_LIMIT === "true") {
        return null;
    }

    // The `/error/[code]` fun status pages (below) are themselves reached
    // via a redirect FROM this function when a real navigation gets
    // blocked — without this exemption, a visitor whose budget is already
    // exhausted would get redirected to `/error/429`, that request would
    // ALSO be over budget, and they'd bounce right back into another
    // redirect: an infinite loop. Checked against the locale-stripped path
    // so `/ru/error/429` (a Russian navigation that got rate-limited) is
    // exempted too, not just the bare English path.
    if (stripLocalePrefix(pathname).withoutLocale.startsWith("/error")) {
        return null;
    }

    const ip = getClientIp(request);

    // Next.js's own client-side router prefetches every visible <Link> in
    // the background, with zero user interaction — a list page with many
    // links can legitimately fire dozens of these per real page view. Found
    // live: the e2e visual suite (see frontend/tests/README.md) was tripping
    // `global` on its own background prefetch traffic, not real navigations.
    // Bucketed separately, NOT exempted outright — the header is
    // client-supplied and trivially spoofable, and a "prefetch" still runs
    // the exact same Server Component/DB work a real navigation would, so a
    // client sending fake prefetch headers on every request must still hit
    // SOME ceiling, just a more generous one sized for legitimate background
    // browsing rather than an unlimited bypass of `global`.
    //
    // IMPORTANT LIMITATION, found later while chasing the redirect bug
    // below (verified with a live header dump from inside this exact
    // function, in both `next dev` and a real `next build && next start`
    // — not assumed): Next.js's Proxy/Middleware layer strips `rsc`,
    // `next-router-state-tree`, AND `next-router-prefetch` from
    // `request.headers` before this function ever sees them, even though
    // the browser genuinely sent them (confirmed with a real Playwright
    // network capture of the outgoing request) and even though Next's own
    // internal router clearly still acts on them (an `rsc: 1` request
    // gets back `Content-Type: text/x-component`). This is documented,
    // deliberate Next.js behavior — see
    // https://nextjs.org/docs/app/api-reference/file-conventions/proxy
    // ("RSC requests and rewrites": "Next.js strips internal Flight
    // headers from the request instance in Proxy... to prevent
    // accidentally handling an RSC request differently than the HTML
    // request"). The practical consequence: `isPrefetch` below is `false`
    // for essentially every real request today, so prefetch traffic
    // already shares `global`'s budget with real navigations regardless
    // of this check — the separate `prefetch` tier is currently a no-op
    // safety net, not a working split. Left in place (rather than
    // deleted) because it's harmless, costs nothing, and would start
    // working again for free if a future Next.js version, or a request
    // arriving through a layer that forwards this header (e.g. some
    // custom CDN/reverse-proxy configurations), ever makes it visible
    // here. Actually fixing the split (e.g. raising `GLOBAL_LIMIT` to
    // account for real prefetch volume, since header-based bucketing
    // isn't achievable here) is tracked as a separate, deliberately
    // out-of-scope follow-up — not fixed as a side effect of this file.
    const isPrefetch = request.headers.get("next-router-prefetch") !== null;
    const baseTier = isPrefetch
        ? checkRateLimit(`prefetch:${ ip }`, PREFETCH_LIMIT, PREFETCH_WINDOW_SECONDS)
        : checkRateLimit(`global:${ ip }`, GLOBAL_LIMIT, GLOBAL_WINDOW_SECONDS);

    const checks = [baseTier];
    if (pathname === "/api/auth/refresh") {
        // Login itself is rate-limited more tightly, and per-account as
        // well as per-IP, inside the route (frontend/src/app/api/auth/login/
        // route.ts) — refresh has no "account" dimension to key on (it
        // authenticates via possession of the refresh token itself), so
        // its extra tier lives here instead, per-IP only.
        checks.push(checkRateLimit(`refresh:${ ip }`, REFRESH_LIMIT, REFRESH_WINDOW_SECONDS));
    } else if (pathname.startsWith("/api/admin")) {
        // A backstop against a buggy/compromised already-authenticated
        // client, not the primary defense — reaching these routes at all
        // already requires a valid session (`defineAdminRoute`).
        checks.push(checkRateLimit(`admin-mutation:${ ip }`, ADMIN_MUTATION_LIMIT, ADMIN_MUTATION_WINDOW_SECONDS));
    }

    const results = await Promise.all(checks);
    const blocked = results.find((result) => !result.allowed);
    if (!blocked) {
        return null;
    }

    const retryAfterSeconds = blocked.retryAfterSeconds ?? 60;

    // A real browser navigation (not `/api/*`, not a declared prefetch)
    // gets bounced to the fun `/error/429` page instead of a bare JSON
    // body — the JSON contract for `/api/*` clients is unchanged.
    //
    // `NextResponse.rewrite()` can't reliably carry a custom status code
    // across Next.js versions (see vercel/next.js#37095 and #50155 — a
    // rewrite's OWN response is always 200 in the common case, regardless
    // of a `status` passed in `init`), so this uses a real redirect: the
    // redirect hop itself is the true 429, and the destination page
    // renders 200 — the same tradeoff most "fun" rate-limit pages make.
    //
    // Deliberately NOT gated on `Accept: text/html` (an earlier version
    // of this check was) — found live, via a real Playwright network
    // capture of clicking an actual <Link>: a client-side App Router
    // navigation fetches the RSC payload with `Accept: */*`, identical to
    // a background prefetch or a plain `curl` hitting the same URL (see
    // `isPrefetch`'s own comment above for why the header that would
    // normally distinguish these, `rsc`, isn't visible here either). Since
    // this app cannot reliably tell "a real click" apart from "a plain
    // request to a page URL" at all, both get treated the same way here —
    // which is also the more correct call on its own merits: `pathname`
    // not starting with `/api` already means this URL's own real response
    // would have been `text/html` anyway, so redirecting it to an HTML
    // error page instead of a JSON one matches what it would have served.
    // A real redirect response is exactly what the App Router's own
    // `fetch()` for an RSC navigation already knows how to follow and
    // re-render from, identically to how `redirect()` from a Server
    // Action works.
    const wantsRedirect = !isPrefetch && !pathname.startsWith("/api");
    if (wantsRedirect) {
        const { isRu } = stripLocalePrefix(pathname);
        // The blocked destination itself (e.g. `/journal?page=2`) travels
        // along as `from`, so the standalone `/error/429` page's "Try
        // again" can retry THAT page instead of just refreshing the
        // (rate-limit-exempt) error page in place — found live: without
        // this, "Try again" refreshed `/error/429` forever, even long
        // after the rate-limit window actually expired, since refreshing
        // an exempt route can never re-trip a check that would send the
        // visitor onward. `StatusPage` re-validates this before ever
        // navigating to it (see `isSafeRelativePath`) — it's about to be
        // shared back to a browser via a URL, so it must be treated as
        // untrusted from that point on, even though it originates here.
        const originalDestination = `${ pathname }${ request.nextUrl.search }`;
        const url = request.nextUrl.clone();
        url.pathname = isRu ? `${ RU_PREFIX }/error/429` : "/error/429";
        url.search = `?${ new URLSearchParams({ retryAfter: String(retryAfterSeconds), from: originalDestination }) }`;
        return NextResponse.redirect(url, 307);
    }

    return NextResponse.json(
        { error: "Too many requests." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
}

/**
 * Shared by `enforceRateLimit` (the `/error` exemption + redirect target)
 * and `handleLocale` (the actual rewrite) — one definition of "does this
 * path carry the `/ru` prefix, and what does it look like without it"
 * instead of the two independently re-deriving the same string slice.
 */
function stripLocalePrefix(pathname: string): { isRu: boolean; withoutLocale: string } {
    const isRu = pathname === RU_PREFIX || pathname.startsWith(`${ RU_PREFIX }/`);
    return { isRu, withoutLocale: isRu ? (pathname.slice(RU_PREFIX.length) || "/") : pathname };
}

function withPathnameHeader(request: NextRequest, pathname: string): NextResponse {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(REQUEST_PATHNAME_HEADER, pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * `/ru`-prefixed public URLs are a REWRITE, not a redirect — the address
 * bar keeps showing `/ru/journal/my-post`, but Next.js resolves it against
 * the exact same route file as `/journal/my-post` (no `[locale]` segment,
 * no duplicated page tree — see the migration plan's routing section for
 * why). The only thing carried across the rewrite is the `x-locale`
 * header, read server-side by `RootLayout` (`getRequestLocale()`) and by
 * the two detail routes that need to pick an English-vs-Russian body
 * Document (`getPostBySlug`/`getWorkBySlug`).
 *
 * Deliberately excludes `/admin` and `/api` (see `proxy()`'s dispatch
 * above) — the admin UI is English-only by design, so it never needs a
 * locale at all.
 */
function handleLocale(request: NextRequest, pathname: string) {
    const { isRu, withoutLocale } = stripLocalePrefix(pathname);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(LOCALE_HEADER, isRu ? "ru" : "en");

    if (!isRu) {
        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const url = request.nextUrl.clone();
    url.pathname = withoutLocale;

    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}
