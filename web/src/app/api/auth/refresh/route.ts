import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@portfolio/backend";
import { REFRESH_TOKEN_COOKIE } from "@/shared/lib/auth-constants";
import { clearAuthCookies, setAuthCookies } from "@/shared/lib/auth-cookies";
import { toErrorResponse } from "@/shared/lib/api-error-response";

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

export async function POST(request: NextRequest) {
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
}
