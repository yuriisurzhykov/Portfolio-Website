import { NextResponse, type NextRequest } from "next/server";
import { logout } from "@portfolio/backend";
import { REFRESH_TOKEN_COOKIE } from "@/shared/lib/auth-constants";
import { clearAuthCookies } from "@/shared/lib/auth-cookies";

export async function POST(request: NextRequest) {
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
}
