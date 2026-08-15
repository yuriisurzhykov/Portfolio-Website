import { describe, expect, it } from "vitest";
import { serializeShadow } from "./shadow";

describe("serializeShadow", () => {
    it("serializes a single layer in CSS box-shadow order (x y blur spread color)", () => {
        expect(serializeShadow([{ x: 0, y: 4, blur: 12, spread: 0, color: "hsl(20 94% 61%)" }])).toBe("0px 4px 12px 0px hsl(20 94% 61%)");
    });

    it("joins multiple layers with a comma, in order", () => {
        expect(
            serializeShadow([
                { x: 0, y: 0, blur: 2, spread: 0, color: "a" },
                { x: 0, y: 4, blur: 12, spread: 0, color: "b" },
            ]),
        ).toBe("0px 0px 2px 0px a, 0px 4px 12px 0px b");
    });

    it("prefixes 'inset' only for a layer that sets it, and never for one that doesn't", () => {
        expect(serializeShadow([{ x: 0, y: 0, blur: 0, spread: 2, color: "c", inset: true }])).toBe("inset 0px 0px 0px 2px c");
        expect(serializeShadow([{ x: 0, y: 0, blur: 0, spread: 2, color: "c", inset: false }])).toBe("0px 0px 0px 2px c");
    });

    it("returns an empty string for an empty layer list", () => {
        expect(serializeShadow([])).toBe("");
    });

    it("preserves negative spread/blur values verbatim (a real shadow shape, e.g. an inset glow)", () => {
        expect(serializeShadow([{ x: 0, y: 2, blur: 6, spread: -1, color: "d" }])).toBe("0px 2px 6px -1px d");
    });
});
