import { NextResponse, type NextRequest } from "next/server";
import { logout } from "@portfolio/backend";
import { REFRESH_TOKEN_COOKIE } from "@/shared/lib/auth-constants";
import { clearAuthCookies } from "@/shared/lib/auth-cookies";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { definePublicRoute } from "@/shared/lib/auth/guard";

/**
 * Public at the `defineRoute` layer — deliberately, not an oversight. This
 * must keep working even when the access token has ALREADY expired (the
 * single most common real reason someone hits "sign out": they're clearing
 * a stuck/expired session), so requiring one here would defeat its own
 * purpose. It reads and revokes the refresh token directly; there's no
 * scenario where "an expired access token" should block this request.
 */
export const POST = definePublicRoute(async (request: NextRequest) => {
    try {
        const cookieToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

        let refreshToken = cookieToken;
        if (!refreshToken) {
            try {
                const body = (await request.json()) as { refreshToken?: unknown };
                refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : undefined;
            } catch {
                // No body at all is fine — nothing to revoke, just clear cookies below.
            }
        }

        if (refreshToken) {
            await logout(refreshToken);
        }

        const response = NextResponse.json({ ok: true });
        clearAuthCookies(response);
        return response;
    } catch (error) {
        return toErrorResponse(error);
    }
});
