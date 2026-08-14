import { describe, expect, it } from "vitest";
import { sha256Hex } from "./content-hash";

describe("sha256Hex", () => {
    it("matches a known sha256 vector", () => {
        // sha256("abc") — a standard published test vector, not derived from this code.
        expect(sha256Hex(Buffer.from("abc"))).toBe(
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        );
    });

    it("is deterministic for the same bytes", () => {
        const bytes = Buffer.from("cover pixels");
        expect(sha256Hex(bytes)).toBe(sha256Hex(bytes));
    });

    it("produces a different hash for different bytes", () => {
        expect(sha256Hex(Buffer.from("a"))).not.toBe(sha256Hex(Buffer.from("b")));
    });

    it("returns a 64-character lowercase hex string", () => {
        expect(sha256Hex(Buffer.from("x"))).toMatch(/^[0-9a-f]{64}$/);
    });
});
