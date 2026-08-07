import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from "./constants";

const adminPrincipal = { userId: "user-1", email: "admin@example.com", scopes: ["admin:*"] };

const { logAuditEventMock } = vi.hoisted(() => ({ logAuditEventMock: vi.fn() }));

vi.mock("./principal", async () => {
    const actual = await vi.importActual<typeof import("./principal")>("./principal");
    return {
        ...actual,
        resolvePrincipal: vi.fn(),
    };
});

vi.mock("@portfolio/backend", () => ({ logAuditEvent: logAuditEventMock }));

// Imported AFTER the mocks so guard.ts's own top-level `import { ... } from
// "./principal"`/`"@portfolio/backend"` binds to the mocked modules,
// matching how vi.mock's hoisting is meant to be used.
import { resolvePrincipal } from "./principal";
import { defineAdminRoute, definePublicRoute } from "./guard";

function makeRequest(method: string, headers: Record<string, string> = {}): NextRequest {
    return new NextRequest(new URL("/api/admin/posts", "http://localhost:3000"), {
        method,
        headers: new Headers(headers),
    });
}

const okHandler = vi.fn(() => new Response(null, { status: 200 }));

describe("defineAdminRoute — CSRF header enforcement", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("allows a mutating request that carries the correct CSRF header", async () => {
        vi.mocked(resolvePrincipal).mockResolvedValue(adminPrincipal);
        const route = defineAdminRoute(okHandler);

        const response = await route(makeRequest("POST", { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE }));

        expect(response.status).toBe(200);
    });

    /**
     * The actual security property this exists to guarantee: a
     * cross-site request forged against this exact endpoint — which,
     * unlike a browser-originated fetch, cannot set an arbitrary header —
     * must be rejected even if it somehow arrives with a valid session
     * cookie attached (SameSite=Strict already blocks that in practice;
     * this is the second, independent layer — see constants.ts).
     */
    it("rejects a mutating request with NO CSRF header, even with a valid principal", async () => {
        vi.mocked(resolvePrincipal).mockResolvedValue(adminPrincipal);
        const route = defineAdminRoute(okHandler);

        const response = await route(makeRequest("POST"));

        expect(response.status).toBe(403);
    });

    it("rejects a mutating request with the WRONG CSRF header value", async () => {
        vi.mocked(resolvePrincipal).mockResolvedValue(adminPrincipal);
        const route = defineAdminRoute(okHandler);

        const response = await route(makeRequest("POST", { [CSRF_HEADER_NAME]: "something-else" }));

        expect(response.status).toBe(403);
    });

    it.each(["PUT", "PATCH", "DELETE"])("also enforces the header on %s, not just POST", async (method) => {
        vi.mocked(resolvePrincipal).mockResolvedValue(adminPrincipal);
        const route = defineAdminRoute(okHandler);

        const response = await route(makeRequest(method));

        expect(response.status).toBe(403);
    });

    it("does NOT require the header on GET (nothing to forge on a read)", async () => {
        vi.mocked(resolvePrincipal).mockResolvedValue(adminPrincipal);
        const route = defineAdminRoute(okHandler);

        const response = await route(makeRequest("GET"));

        expect(response.status).toBe(200);
    });

    it("returns 401 (not 403) for an unauthenticated request, regardless of the CSRF header", async () => {
        vi.mocked(resolvePrincipal).mockResolvedValue(null);
        const route = defineAdminRoute(okHandler);

        const response = await route(makeRequest("POST"));

        expect(response.status).toBe(401);
    });
});

describe("definePublicRoute — deliberately NOT subject to the CSRF header check", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("allows a mutating request with no CSRF header at all — login/logout/refresh own their own security boundary", async () => {
        vi.mocked(resolvePrincipal).mockResolvedValue(null);
        const route = definePublicRoute(okHandler);

        const response = await route(makeRequest("POST"));

        expect(response.status).toBe(200);
    });
});

describe("defineAdminRoute — audit logging of admin mutations", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("logs an admin_mutation event with the principal, method, path, and response status on a successful mutation", async () => {
        vi.mocked(resolvePrincipal).mockResolvedValue(adminPrincipal);
        const route = defineAdminRoute(okHandler);

        await route(makeRequest("POST", { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE }));

        expect(logAuditEventMock).toHaveBeenCalledTimes(1);
        expect(logAuditEventMock).toHaveBeenCalledWith("admin_mutation", {
            userId: adminPrincipal.userId,
            email: adminPrincipal.email,
            method: "POST",
            path: "/api/admin/posts",
            status: 200,
        });
    });

    it("still logs the mutation attempt even when the handler itself returns an error status", async () => {
        vi.mocked(resolvePrincipal).mockResolvedValue(adminPrincipal);
        const failingHandler = vi.fn(() => new Response(null, { status: 500 }));
        const route = defineAdminRoute(failingHandler);

        await route(makeRequest("DELETE", { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE }));

        expect(logAuditEventMock).toHaveBeenCalledWith("admin_mutation", expect.objectContaining({ status: 500 }));
    });

    it("does NOT log anything for a GET request — nothing mutated", async () => {
        vi.mocked(resolvePrincipal).mockResolvedValue(adminPrincipal);
        const route = defineAdminRoute(okHandler);

        await route(makeRequest("GET"));

        expect(logAuditEventMock).not.toHaveBeenCalled();
    });

    it("does NOT log a mutation that was rejected for missing the CSRF header — the handler (and whatever it would have done) never ran", async () => {
        vi.mocked(resolvePrincipal).mockResolvedValue(adminPrincipal);
        const route = defineAdminRoute(okHandler);

        await route(makeRequest("POST"));

        expect(logAuditEventMock).not.toHaveBeenCalled();
    });

    it("does NOT log a mutation attempt from an unauthenticated caller — nothing but the 401 itself happened", async () => {
        vi.mocked(resolvePrincipal).mockResolvedValue(null);
        const route = defineAdminRoute(okHandler);

        await route(makeRequest("POST", { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE }));

        expect(logAuditEventMock).not.toHaveBeenCalled();
    });
});

describe("definePublicRoute — never logs admin_mutation (public routes own their own auditing, if any)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("does not call logAuditEvent for a mutating public route", async () => {
        vi.mocked(resolvePrincipal).mockResolvedValue(null);
        const route = definePublicRoute(okHandler);

        await route(makeRequest("POST"));

        expect(logAuditEventMock).not.toHaveBeenCalled();
    });
});
