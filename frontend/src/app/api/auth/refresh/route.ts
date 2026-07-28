import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@portfolio/backend";
import { REFRESH_TOKEN_COOKIE } from "@/shared/lib/auth-constants";
import { clearAuthCookies, setAuthCookies } from "@/shared/lib/auth-cookies";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { definePublicRoute } from "@/shared/lib/auth/guard";

async function getRefreshToken(request: NextRequest): Promise<string | undefined> {
    const cookieToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    if (cookieToken) return cookieToken;

    // Non-browser clients (mobile app, scripts) send it in the body instead
    // of relying on a cookie jar.
    try {
        const body = (await request.json()) as { refreshToken?: unknown };
        return typeof body.refreshToken === "string" ? body.refreshToken : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Public at the `defineRoute` layer on purpose — the whole point of this
 * route is to mint a new access token when the old one is gone/expired, so
 * requiring a valid access token to call it would be circular. Its real
 * security boundary is the refresh token itself (opaque, hashed at rest,
 * single-use via rotation — see `backend/src/auth/session.ts`), not
 * anything checked here.
 */
export const POST = definePublicRoute(async (request: NextRequest) => {
    try {
        const refreshToken = await getRefreshToken(request);
        if (!refreshToken) {
            return NextResponse.json({ error: "No refresh token provided." }, { status: 401 });
        }

        const result = await refreshSession(refreshToken, {
            userAgent: request.headers.get("user-agent") ?? undefined,
            ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
        });

        if (!result) {
            const response = NextResponse.json({ error: "Refresh token is invalid, expired, or already used." }, { status: 401 });
            clearAuthCookies(response);
            return response;
        }

        const response = NextResponse.json({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        });
        setAuthCookies(response, result.accessToken, result.refreshToken);
        return response;
    } catch (error) {
        return toErrorResponse(error);
    }
});
