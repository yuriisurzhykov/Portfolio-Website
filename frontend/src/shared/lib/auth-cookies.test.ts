import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./auth-constants";
import { clearAuthCookies, setAuthCookies } from "./auth-cookies";

describe("setAuthCookies", () => {
    it("sets both cookies as httpOnly, SameSite=Strict, path=/", () => {
        const response = NextResponse.json({ ok: true });
        setAuthCookies(response, "access-token-value", "refresh-token-value");

        const access = response.cookies.get(ACCESS_TOKEN_COOKIE);
        const refresh = response.cookies.get(REFRESH_TOKEN_COOKIE);

        expect(access?.value).toBe("access-token-value");
        expect(refresh?.value).toBe("refresh-token-value");

        for (const cookie of [access, refresh]) {
            expect(cookie?.httpOnly).toBe(true);
            expect(cookie?.sameSite).toBe("strict");
            expect(cookie?.path).toBe("/");
        }
    });
});

describe("clearAuthCookies", () => {
    /**
     * The real bug this guards against: a browser only deletes a cookie
     * whose `path` matches the one it was SET with. `setAuthCookies` above
     * always sets `path: "/"` — if `clearAuthCookies` ever deletes by name
     * alone (no explicit path) and a future Next.js version's own default
     * path stops matching "/", logout would silently stop actually
     * clearing the cookie in a real browser, even though this test
     * environment might not surface that mismatch on its own.
     */
    it("deletes both cookies with an explicit path of / (not relying on a framework default matching setAuthCookies' own path)", () => {
        const response = NextResponse.json({ ok: true });
        clearAuthCookies(response);

        const setCookieHeaders = response.headers.getSetCookie();
        expect(setCookieHeaders).toHaveLength(2);
        for (const header of setCookieHeaders) {
            expect(header.toLowerCase()).toContain("path=/");
        }
    });

    it("clears a cookie that was actually set by setAuthCookies — round-trip, not just checked in isolation", () => {
        const response = NextResponse.json({ ok: true });
        setAuthCookies(response, "access-token-value", "refresh-token-value");
        clearAuthCookies(response);

        // The LAST Set-Cookie for each name wins in a real browser — after
        // both calls, the deletion (empty value, expired) must be what
        // actually took effect, not the original set silently surviving
        // underneath it.
        const access = response.cookies.get(ACCESS_TOKEN_COOKIE);
        const refresh = response.cookies.get(REFRESH_TOKEN_COOKIE);
        expect(access?.value).toBe("");
        expect(refresh?.value).toBe("");
    });
});
