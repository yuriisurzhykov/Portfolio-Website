import { describe, expect, it } from "vitest";
import { clampMetaDescription } from "./meta-description";

describe("clampMetaDescription", () => {
    it("returns a short string untouched", () => {
        expect(clampMetaDescription("A short description.")).toBe("A short description.");
    });

    it("returns a string exactly at the limit untouched", () => {
        const value = "a".repeat(155);
        expect(clampMetaDescription(value)).toBe(value);
    });

    it("cuts a long description at a word boundary and marks the cut", () => {
        const value = "word ".repeat(40).trim(); // 199 chars, well over the 155 default
        const result = clampMetaDescription(value);

        expect(result.length).toBeLessThanOrEqual(155);
        expect(result.endsWith("…")).toBe(true);
        // No half-cut word right before the ellipsis.
        expect(result.slice(0, -1).endsWith("word")).toBe(true);
    });

    it("falls back to a hard cut when there is no earlier space to break on", () => {
        const value = "a".repeat(200);
        const result = clampMetaDescription(value, 10);

        expect(result).toBe(`${ "a".repeat(10) }…`);
    });

    it("respects a custom max length", () => {
        // slice(0, 7) is "one two" (7 chars); the LAST space inside that
        // slice sits right before "two", so the break lands after "one".
        expect(clampMetaDescription("one two three four", 7)).toBe("one…");
    });
});
