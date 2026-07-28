import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError, SessionExpiredError, adminApi } from "./admin-api";

function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("admin-api request()", () => {
    const originalLocation = window.location;
    let assignSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // jsdom's `window.location.assign` is a non-configurable property on
        // the real `Location` object — `vi.spyOn` can't redefine it directly.
        // Replacing `window.location` wholesale with a plain object (same
        // pattern used broadly for testing `location.assign`/`.href`) is the
        // standard workaround.
        assignSpy = vi.fn();
        Object.defineProperty(window, "location", {
            value: { ...originalLocation, assign: assignSpy },
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        Object.defineProperty(window, "location", { value: originalLocation, writable: true, configurable: true });
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("returns parsed JSON on a plain successful request", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { ok: true })));

        const result = await adminApi.logout();
        expect(result).toEqual({ ok: true });
    });

    it("on a 401, silently refreshes once and retries the original request — the caller never sees the 401", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse(401, { error: "Unauthorized" })) // original request
            .mockResolvedValueOnce(jsonResponse(200, { ok: true })) // /api/auth/refresh
            .mockResolvedValueOnce(jsonResponse(200, { ok: true })); // retried original request
        vi.stubGlobal("fetch", fetchMock);

        const result = await adminApi.deletePost("some-slug");

        expect(result).toEqual({ ok: true });
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/refresh");
        expect(assignSpy).not.toHaveBeenCalled();
    });

    it("when the refresh itself fails, redirects to /admin/login?from=... and throws SessionExpiredError instead of a generic error", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse(401, { error: "Unauthorized" })) // original request
            .mockResolvedValueOnce(jsonResponse(401, { error: "Refresh token is invalid, expired, or already used." })); // refresh fails
        vi.stubGlobal("fetch", fetchMock);

        await expect(adminApi.deletePost("some-slug")).rejects.toBeInstanceOf(SessionExpiredError);

        expect(assignSpy).toHaveBeenCalledTimes(1);
        expect(assignSpy.mock.calls[0][0]).toContain("/admin/login?from=");
    });

    it("when the retried request ALSO 401s after a successful refresh, still redirects (doesn't loop forever)", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse(401, { error: "Unauthorized" })) // original request
            .mockResolvedValueOnce(jsonResponse(200, { ok: true })) // refresh succeeds
            .mockResolvedValueOnce(jsonResponse(401, { error: "Unauthorized" })); // retry still fails
        vi.stubGlobal("fetch", fetchMock);

        await expect(adminApi.deletePost("some-slug")).rejects.toBeInstanceOf(SessionExpiredError);
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(assignSpy).toHaveBeenCalledTimes(1);
    });

    it("concurrent 401s share exactly one refresh call (single-flight), not one per request", async () => {
        let refreshCalls = 0;
        const callCountPerUrl = new Map<string, number>();
        const fetchMock = vi.fn().mockImplementation((url: string) => {
            if (url === "/api/auth/refresh") {
                refreshCalls += 1;
                return Promise.resolve(jsonResponse(200, { ok: true }));
            }
            // First hit to a given URL 401s, the retry (second hit to the
            // SAME url) succeeds — deterministic per-request, independent
            // of the other concurrent request's URL.
            const count = (callCountPerUrl.get(url) ?? 0) + 1;
            callCountPerUrl.set(url, count);
            return Promise.resolve(count === 1 ? jsonResponse(401, { error: "Unauthorized" }) : jsonResponse(200, { ok: true }));
        });
        vi.stubGlobal("fetch", fetchMock);

        await Promise.all([adminApi.deletePost("a"), adminApi.deletePost("b")]);

        expect(refreshCalls).toBe(1);
    });

    it("a non-401 error response throws a plain AdminApiError with the server's message, no refresh attempted", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(409, { error: "Slug already exists." })));

        const error = await adminApi.createPost({
            slug: "x",
            title: "x",
            category: "x",
            excerpt: "x",
            status: "published",
            relatedWorkSlug: null,
            blocks: [],
        }).catch((err: unknown) => err);

        expect(error).toBeInstanceOf(AdminApiError);
        expect((error as AdminApiError).status).toBe(409);
        expect((error as AdminApiError).message).toBe("Slug already exists.");
        expect(assignSpy).not.toHaveBeenCalled();
    });
});
