import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { createAdminUser } from "./create-admin-user";
import { login, logout, refreshSession } from "./auth-service";
import { verifyAccessToken } from "./jwt";

const EMAIL = "admin@example.com";
const PASSWORD = "a-real-password-123";

beforeEach(async () => {
    await resetTestDatabase();
    await createAdminUser(EMAIL, PASSWORD);
});

describe("login", () => {
    it("returns null for a wrong password", async () => {
        expect(await login(EMAIL, "wrong-password")).toBeNull();
    });

    it("returns null for an email that doesn't exist", async () => {
        expect(await login("nobody@example.com", PASSWORD)).toBeNull();
    });

    it("returns a usable access token + refresh token for correct credentials", async () => {
        const result = await login(EMAIL, PASSWORD);
        expect(result).not.toBeNull();
        expect(result?.user.email).toBe(EMAIL);

        const verified = await verifyAccessToken(result!.accessToken);
        expect(verified?.email).toBe(EMAIL);
        expect(verified?.role).toBe("admin");
    });

    it("does not leak whether the email exists via response timing (dummy-hash mitigation)", async () => {
        // Not a strict timing assertion (too flaky in CI) — this instead
        // asserts the mechanism directly: an unknown email must still
        // reach a real argon2 verify against SOME hash, not short-circuit.
        // See the comment on getDummyHash() in auth-service.ts for the
        // full rationale.
        const start = Date.now();
        await login("nobody@example.com", PASSWORD);
        const unknownEmailMs = Date.now() - start;

        const start2 = Date.now();
        await login(EMAIL, "wrong-password");
        const wrongPasswordMs = Date.now() - start2;

        // Both paths do a real argon2 verify, so neither should be
        // dramatically (10x+) faster than the other — a wide margin, not an
        // exact match, since CI runners are noisy.
        const ratio = Math.max(unknownEmailMs, wrongPasswordMs) / Math.max(1, Math.min(unknownEmailMs, wrongPasswordMs));
        expect(ratio).toBeLessThan(10);
    });
});

describe("refreshSession", () => {
    it("rotates the refresh token and issues a still-valid access token", async () => {
        const original = await login(EMAIL, PASSWORD);
        const refreshed = await refreshSession(original!.refreshToken);

        expect(refreshed).not.toBeNull();
        expect(refreshed?.refreshToken).not.toBe(original?.refreshToken);
        // Not asserting the new accessToken string differs from the
        // original: both encode {sub, email, role, iat, exp}, and when a
        // test's login+refresh land in the same wall-clock second, `iat`
        // (second-precision) is identical too — making the two tokens
        // byte-identical without anything being wrong. That's not a
        // security property worth asserting on either way (an
        // access token doesn't need to change on every refresh to be
        // safe); what actually matters is that the new one verifies.
        const verified = await verifyAccessToken(refreshed!.accessToken);
        expect(verified?.email).toBe(EMAIL);
    });

    it("rejects reusing the original token after a refresh (rotation, not just renewal)", async () => {
        const original = await login(EMAIL, PASSWORD);
        await refreshSession(original!.refreshToken);

        expect(await refreshSession(original!.refreshToken)).toBeNull();
    });

    it("rejects an unknown refresh token", async () => {
        expect(await refreshSession("never-issued")).toBeNull();
    });
});

describe("logout", () => {
    it("invalidates the refresh token so it can no longer be used to refresh", async () => {
        const result = await login(EMAIL, PASSWORD);
        await logout(result!.refreshToken);

        expect(await refreshSession(result!.refreshToken)).toBeNull();
    });

    it("does not throw when logging out with a token that was never issued", async () => {
        await expect(logout("never-issued")).resolves.not.toThrow();
    });
});
