import { NextResponse, type NextRequest } from "next/server";
import { checkLoginRateLimit, login, resetLoginRateLimit } from "@portfolio/backend";
import { setAuthCookies } from "@/shared/lib/auth-cookies";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { getClientIp } from "@/shared/lib/client-ip";
import { definePublicRoute } from "@/shared/lib/auth/guard";

/**
 * Two independent rate-limit dimensions, both must pass — an attacker
 * spraying one password across many accounts from one IP is caught by the
 * `ip:` key, an attacker distributing guesses for ONE account across many
 * IPs (botnet, proxy rotation) is caught by the `account:` key. Neither
 * alone catches both shapes of attack. `checkLoginRateLimit` counts this
 * call itself (every attempt, not just failures — see its doc comment in
 * backend/src/auth/rate-limit.ts), so no separate "record" call is needed
 * below; a successful login resets both dimensions instead.
 */
export const POST = definePublicRoute(async (request: NextRequest) => {
    const clientIp = getClientIp(request);

    try {
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
        }

        const { email, password } = (body ?? {}) as { email?: unknown; password?: unknown };
        if (typeof email !== "string" || typeof password !== "string") {
            return NextResponse.json({ error: "email and password are required." }, { status: 400 });
        }
        const accountKey = `account:${ email.trim().toLowerCase() }`;
        const ipKey = `ip:${ clientIp }`;

        const [ipLimit, accountLimit] = await Promise.all([
            checkLoginRateLimit(ipKey),
            checkLoginRateLimit(accountKey),
        ]);
        if (!ipLimit.allowed || !accountLimit.allowed) {
            const retryAfterSeconds = Math.max(ipLimit.retryAfterSeconds ?? 0, accountLimit.retryAfterSeconds ?? 0);
            return NextResponse.json(
                { error: "Too many login attempts. Try again later." },
                { status: 429, headers: { "Retry-After": String(retryAfterSeconds || 60) } },
            );
        }

        const result = await login(email, password, {
            userAgent: request.headers.get("user-agent") ?? undefined,
            ip: clientIp,
        });

        if (!result) {
            return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
        }

        await Promise.all([resetLoginRateLimit(ipKey), resetLoginRateLimit(accountKey)]);

        // Tokens go both into httpOnly cookies (what the browser-based admin UI
        // actually uses) AND the JSON body (so a non-browser client — a future
        // mobile app, a script, Postman — can use Bearer auth instead). See
        // backend/README.md's auth design notes for why both exist.
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
