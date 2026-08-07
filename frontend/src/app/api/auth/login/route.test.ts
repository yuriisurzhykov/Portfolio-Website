import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { loginMock, checkLoginRateLimitMock, resetLoginRateLimitMock, logAuditEventMock } = vi.hoisted(() => ({
    loginMock: vi.fn(),
    checkLoginRateLimitMock: vi.fn(),
    resetLoginRateLimitMock: vi.fn(),
    logAuditEventMock: vi.fn(),
}));

vi.mock("@portfolio/backend", () => ({
    login: loginMock,
    checkLoginRateLimit: checkLoginRateLimitMock,
    resetLoginRateLimit: resetLoginRateLimitMock,
    logAuditEvent: logAuditEventMock,
}));

// Imported AFTER the mock, same reasoning as guard.test.ts.
import { POST } from "./route";

function makeRequest(body: unknown): NextRequest {
    return new NextRequest(new URL("/api/auth/login", "http://localhost:3000"), {
        method: "POST",
        headers: new Headers({ "content-type": "application/json" }),
        body: JSON.stringify(body),
    });
}

const ALLOWED = { allowed: true };
const SECRET_PASSWORD = "this-is-the-real-secret-password";

describe("POST /api/auth/login — audit logging", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("logs login_failed with only email/ip on a wrong password — the password itself must never appear", async () => {
        checkLoginRateLimitMock.mockResolvedValue(ALLOWED);
        loginMock.mockResolvedValue(null);

        await POST(makeRequest({ email: "admin@example.com", password: SECRET_PASSWORD }));

        expect(logAuditEventMock).toHaveBeenCalledTimes(1);
        const [event, fields] = logAuditEventMock.mock.calls[0];
        expect(event).toBe("login_failed");
        // The actual security property: the real invariant isn't "password
        // key is absent" (a mutant could rename it) — it's that the literal
        // secret STRING never appears anywhere in what was logged, checked
        // by serializing the whole call the same way the real sink does.
        expect(JSON.stringify(fields)).not.toContain(SECRET_PASSWORD);
        expect(fields).toEqual({ email: "admin@example.com", ip: expect.any(String) });
    });

    it("logs login_succeeded with userId/email/ip (never the password or the issued tokens) on success", async () => {
        checkLoginRateLimitMock.mockResolvedValue(ALLOWED);
        resetLoginRateLimitMock.mockResolvedValue(undefined);
        loginMock.mockResolvedValue({
            user: { id: "user-1", email: "admin@example.com", role: "admin" },
            accessToken: "secret-access-token-value",
            refreshToken: "secret-refresh-token-value",
        });

        await POST(makeRequest({ email: "admin@example.com", password: SECRET_PASSWORD }));

        expect(logAuditEventMock).toHaveBeenCalledTimes(1);
        const [event, fields] = logAuditEventMock.mock.calls[0];
        expect(event).toBe("login_succeeded");
        const serialized = JSON.stringify(fields);
        expect(serialized).not.toContain(SECRET_PASSWORD);
        expect(serialized).not.toContain("secret-access-token-value");
        expect(serialized).not.toContain("secret-refresh-token-value");
        expect(fields).toEqual({ userId: "user-1", email: "admin@example.com", ip: expect.any(String) });
    });

    it("logs login_rate_limited (not login_failed) when the rate limit itself blocks the attempt", async () => {
        checkLoginRateLimitMock.mockResolvedValue({ allowed: false, retryAfterSeconds: 60 });

        await POST(makeRequest({ email: "admin@example.com", password: SECRET_PASSWORD }));

        expect(logAuditEventMock).toHaveBeenCalledTimes(1);
        const [event, fields] = logAuditEventMock.mock.calls[0];
        expect(event).toBe("login_rate_limited");
        expect(JSON.stringify(fields)).not.toContain(SECRET_PASSWORD);
        expect(loginMock).not.toHaveBeenCalled();
    });

    it("does not log anything for a malformed request body (never reached a real login attempt)", async () => {
        await POST(makeRequest({ email: "admin@example.com" })); // missing password

        expect(logAuditEventMock).not.toHaveBeenCalled();
    });
});

describe("POST /api/auth/login — input size limits (loginInputSchema)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * The actual security property: an oversized body must be rejected
     * with a plain 400 BEFORE it ever reaches `login()`/`argon2.verify()`
     * — a deliberately expensive hash comparison. A weaker check (e.g.
     * only verifying both fields are strings, with no length bound) would
     * let a multi-megabyte password sail straight through to that
     * comparison on every single request, turning it into a cheap,
     * repeatable CPU-cost amplification.
     */
    it("rejects a password longer than 128 characters with a 400, without ever calling login()", async () => {
        checkLoginRateLimitMock.mockResolvedValue(ALLOWED);

        const response = await POST(makeRequest({ email: "admin@example.com", password: "a".repeat(129) }));

        expect(response.status).toBe(400);
        expect(loginMock).not.toHaveBeenCalled();
        expect(checkLoginRateLimitMock).not.toHaveBeenCalled();
    });

    it("accepts a password of exactly 128 characters (the boundary itself)", async () => {
        checkLoginRateLimitMock.mockResolvedValue(ALLOWED);
        loginMock.mockResolvedValue(null);

        const response = await POST(makeRequest({ email: "admin@example.com", password: "a".repeat(128) }));

        expect(response.status).toBe(401); // reached login(), just wrong credentials
        expect(loginMock).toHaveBeenCalledTimes(1);
    });

    it("rejects an email longer than 254 characters with a 400", async () => {
        const response = await POST(makeRequest({ email: `${ "a".repeat(250) }@example.com`, password: SECRET_PASSWORD }));

        expect(response.status).toBe(400);
        expect(loginMock).not.toHaveBeenCalled();
    });

    it("rejects an empty password with a 400", async () => {
        const response = await POST(makeRequest({ email: "admin@example.com", password: "" }));

        expect(response.status).toBe(400);
        expect(loginMock).not.toHaveBeenCalled();
    });
});
