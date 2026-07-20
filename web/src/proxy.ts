import { NextResponse, type NextRequest } from "next/server";
import { verifyAccessToken } from "@portfolio/backend/edge";
import { ACCESS_TOKEN_COOKIE } from "@/shared/lib/auth-constants";
import { LOCALE_HEADER, RU_PREFIX } from "@/shared/lib/locale-constants";

export const config = {
    matcher: [
        "/admin/:path*",
        "/api/admin/:path*",
        // Every public site route, i.e. everything except /admin, /api (both
        // handled by the two patterns above — or deliberately not handled
        // at all, for the rest of /api, see the proxy() comment), Next.js
        // internals, and any request for a file with an extension
        // (favicons, images, etc. — those never carry a locale prefix).
        "/((?!admin|api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)",
    ],
};

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login"]);

/**
 * Renamed from `middleware.ts`/`export function middleware` per Next.js
 * 16's rename of this file convention to `proxy.ts`/`export function
 * proxy()` — see web/README.md's journal entry. Runs on the Edge runtime
 * by default, which is why this imports from `@portfolio/backend/edge`
 * (verifyAccessToken only) instead of the package's main entry point —
 * that one transitively pulls in Prisma/pg/node:crypto via the
 * session/login exports, none of which work on Edge.
 *
 * Two independent jobs live in this one file (Next.js only allows a single
 * proxy/middleware per app) — admin auth (unchanged from before) and,
 * new here, locale routing for the public site. They're kept as two
 * separate functions below and dispatched by path prefix so neither has to
 * understand the other's concern.
 */
export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
        return handleAdminAuth(request, pathname);
    }

    return handleLocale(request, pathname);
}

async function handleAdminAuth(request: NextRequest, pathname: string) {
    if (PUBLIC_ADMIN_PATHS.has(pathname)) {
        return NextResponse.next();
    }

    const isApiRoute = pathname.startsWith("/api/admin");
    const bearerHeader = request.headers.get("authorization");
    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
        ?? (bearerHeader?.match(/^Bearer\s+(.+)$/i)?.[1]);

    const payload = accessToken ? await verifyAccessToken(accessToken) : null;

    if (!payload) {
        if (isApiRoute) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(loginUrl);
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.sub);
    requestHeaders.set("x-user-email", payload.email);
    requestHeaders.set("x-user-role", payload.role);

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
 * above and the plan's Phase 4 note) — the admin UI is English-only by
 * design, so it never needs a locale at all.
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
