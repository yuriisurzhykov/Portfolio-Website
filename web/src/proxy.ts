import { NextResponse, type NextRequest } from "next/server";
import { verifyAccessToken } from "@portfolio/backend/edge";
import { ACCESS_TOKEN_COOKIE } from "@/shared/lib/auth-constants";

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*"],
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
 */
export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

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
