import { describe, expect, it } from "vitest";
import { generateOpaqueToken, hashToken } from "./tokens";

describe("tokens", () => {
    it("generates a different token on every call", () => {
        const a = generateOpaqueToken();
        const b = generateOpaqueToken();
        expect(a).not.toBe(b);
    });

    it("generates tokens with enough entropy to not collide in practice", () => {
        const tokens = new Set(Array.from({length: 1000}, () => generateOpaqueToken()));
        expect(tokens.size).toBe(1000);
    });

    it("hashToken is deterministic — same input always hashes the same", () => {
        const token = generateOpaqueToken();
        expect(hashToken(token)).toBe(hashToken(token));
    });

    it("hashToken output never contains the original token", () => {
        const token = generateOpaqueToken();
        expect(hashToken(token)).not.toContain(token);
    });

    it("different tokens hash to different values", () => {
        const a = generateOpaqueToken();
        const b = generateOpaqueToken();
        expect(hashToken(a)).not.toBe(hashToken(b));
    });
});
