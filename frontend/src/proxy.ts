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

    // A real browser navigation (not `/api/*`, not a background prefetch)
    // gets bounced to the fun `/error/429` page instead of a bare JSON
    // body — the JSON contract for everything else (API clients, the
    // prefetch tier itself) is unchanged, which is also what keeps this
    // from touching proxy.test.ts's existing assertions: `makeRequest()`
    // there never sets an `Accept` header, so those requests stay on the
    // JSON branch below exactly as before.
    //
    // `NextResponse.rewrite()` can't reliably carry a custom status code
    // across Next.js versions (see vercel/next.js#37095 and #50155 — a
    // rewrite's OWN response is always 200 in the common case, regardless
    // of a `status` passed in `init`), so this uses a real redirect: the
    // redirect hop itself is the true 429, and the destination page
    // renders 200 — the same tradeoff most "fun" rate-limit pages make.
    const wantsHtml = !isPrefetch
        && !pathname.startsWith("/api")
        && (request.headers.get("accept")?.includes("text/html") ?? false);
    if (wantsHtml) {
        const { isRu } = stripLocalePrefix(pathname);
        const url = request.nextUrl.clone();
        url.pathname = isRu ? `${ RU_PREFIX }/error/429` : "/error/429";
        url.search = `?retryAfter=${ retryAfterSeconds }`;
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
