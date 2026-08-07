import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { checkLoginRateLimit, login, logAuditEvent, resetLoginRateLimit } from "@portfolio/backend";
import { setAuthCookies } from "@/shared/lib/auth-cookies";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { getClientIp } from "@/shared/lib/client-ip";
import { definePublicRoute } from "@/shared/lib/auth/guard";

/**
 * Replaces a hand-rolled pair of `typeof` checks — added during the OWASP
 * audit remediation. The `typeof` version only ever checked SHAPE, never
 * SIZE: a multi-megabyte string for either field would have sailed straight
 * through to `argon2.verify()` (a deliberately expensive hash comparison,
 * see `backend/src/auth/password.ts`), turning an oversized request body
 * into a cheap, repeatable CPU-cost amplification. 254 for email matches
 * RFC 5321's own maximum mailbox length; 128 for password is generous
 * above any real password (`create-admin-user.ts`'s own minimum is 12)
 * without inviting the hash-cost amplification a much larger bound would.
 * `.email()` is deliberately NOT used — see `configContentSchema`'s own
 * comment in `backend/src/content/site-content.ts` for the same convention
 * (stricter format validation isn't this check's job; `login()` itself
 * already returns a uniform "Invalid email or password" for a genuinely
 * malformed address, same as any other wrong credential).
 */
const loginInputSchema = z.object({
    email: z.string().min(1).max(254),
    password: z.string().min(1).max(128),
});

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

        const parsed = loginInputSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "email and password are required." }, { status: 400 });
        }
        const { email, password } = parsed.data;
        const normalizedEmail = email.trim().toLowerCase();
        const accountKey = `account:${ normalizedEmail }`;
        const ipKey = `ip:${ clientIp }`;

        const [ipLimit, accountLimit] = await Promise.all([
            checkLoginRateLimit(ipKey),
            checkLoginRateLimit(accountKey),
        ]);
        if (!ipLimit.allowed || !accountLimit.allowed) {
            // A real, ongoing brute-force/credential-stuffing signal — logged
            // distinctly from a plain wrong-password `login_failed` below,
            // since "many attempts against one account/IP in one window" and
            // "one wrong password" call for different operational responses.
            logAuditEvent("login_rate_limited", { email: normalizedEmail, ip: clientIp });
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
            // email/ip only — NEVER the password, matching audit-log.ts's own
            // doc comment on what a call site is allowed to pass.
            logAuditEvent("login_failed", { email: normalizedEmail, ip: clientIp });
            return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
        }

        logAuditEvent("login_succeeded", { userId: result.user.id, email: normalizedEmail, ip: clientIp });
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
