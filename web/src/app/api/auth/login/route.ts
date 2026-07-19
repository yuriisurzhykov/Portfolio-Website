import { NextResponse, type NextRequest } from "next/server";
import { checkLoginRateLimit, login, recordFailedLogin, resetLoginRateLimit } from "@portfolio/backend";
import { setAuthCookies } from "@/shared/lib/auth-cookies";

/** Best-effort client IP: trusts `x-forwarded-for` since nginx sits in front of this app in production (see deploy plan, Phase 6). Falls back to a constant key locally, where there's no proxy setting that header. */
function getClientKey(request: NextRequest): string {
    const forwardedFor = request.headers.get("x-forwarded-for");
    return forwardedFor?.split(",")[0]?.trim() ?? "local-dev";
}

export async function POST(request: NextRequest) {
    const clientKey = getClientKey(request);

    const rateLimit = checkLoginRateLimit(clientKey);
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "Too many failed login attempts. Try again later." },
            { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds ?? 60) } },
        );
    }

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

    const result = await login(email, password, {
        userAgent: request.headers.get("user-agent") ?? undefined,
        ip: clientKey,
    });

    if (!result) {
        recordFailedLogin(clientKey);
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    resetLoginRateLimit(clientKey);

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
}
