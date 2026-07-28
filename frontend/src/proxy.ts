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
    const ip = getClientIp(request);

    const checks = [checkRateLimit(`global:${ ip }`, GLOBAL_LIMIT, GLOBAL_WINDOW_SECONDS)];
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
    return NextResponse.json(
        { error: "Too many requests." },
        { status: 429, headers: { "Retry-After": String(blocked.retryAfterSeconds ?? 60) } },
    );
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
    const isRu = pathname === RU_PREFIX || pathname.startsWith(`${ RU_PREFIX }/`);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(LOCALE_HEADER, isRu ? "ru" : "en");

    if (!isRu) {
        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const rewrittenPathname = pathname.slice(RU_PREFIX.length) || "/";
    const url = request.nextUrl.clone();
    url.pathname = rewrittenPathname;

    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}
