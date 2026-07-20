import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken } from "./jwt";

const samplePayload = {sub: "user-123", email: "person@example.com", role: "admin"};

describe("jwt", () => {
    it("round-trips a signed token back to its original payload", async () => {
        const token = await signAccessToken(samplePayload);
        const verified = await verifyAccessToken(token);
        expect(verified).toEqual(samplePayload);
    });

    it("rejects a tampered token", async () => {
        const token = await signAccessToken(samplePayload);
        const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
        expect(await verifyAccessToken(tampered)).toBeNull();
    });

    it("rejects a garbage string", async () => {
        expect(await verifyAccessToken("not-a-jwt-at-all")).toBeNull();
    });

    it("rejects an empty string", async () => {
        expect(await verifyAccessToken("")).toBeNull();
    });
});
