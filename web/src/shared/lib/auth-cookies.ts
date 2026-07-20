import type { NextResponse } from "next/server";
import {
    ACCESS_TOKEN_COOKIE,
    ACCESS_TOKEN_MAX_AGE_SECONDS,
    REFRESH_TOKEN_COOKIE,
    REFRESH_TOKEN_MAX_AGE_SECONDS,
} from "./auth-constants";

/**
 * `secure` is forced off outside production so login works over plain
 * `http://localhost` during local dev — browsers silently drop `Secure`
 * cookies on non-HTTPS origins, which would otherwise make login look
 * "broken" locally for a reason that has nothing to do with the auth logic
 * itself.
 */
const isProduction = process.env.NODE_ENV === "production";

/**
 * Sets both auth cookies after a successful login/refresh. SameSite=Strict
 * (not the more common Lax): this app has no legitimate reason to have
 * these cookies attached to a cross-site navigation at all — nothing
 * outside this app should ever link into /admin expecting to arrive
 * already authenticated. Strict is a stronger default with no real
 * downside for this specific case. This is a first layer, not the whole
 * CSRF story — dedicated CSRF hardening (e.g. an explicit token/header
 * check on mutating admin requests) is planned for Phase 6, not skipped.
 */
export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string): void {
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        path: "/",
        maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
    });

    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        path: "/",
        maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    });
}

export function clearAuthCookies(response: NextResponse): void {
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
}
