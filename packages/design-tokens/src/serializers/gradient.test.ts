import { describe, expect, it } from "vitest";
import { serializeGradient, validateGradientStops } from "./gradient";

describe("serializeGradient", () => {
    it("serializes a linear gradient with its angle and stops in order", () => {
        expect(
            serializeGradient({
                type: "linear",
                angle: 135,
                stops: [{ color: "a", position: 0 }, { color: "b", position: 100 }],
            }),
        ).toBe("linear-gradient(135deg, a 0%, b 100%)");
    });

    it("serializes a radial gradient, defaulting shape to ellipse when omitted", () => {
        expect(
            serializeGradient({ type: "radial", position: "30% 30%", stops: [{ color: "a", position: 0 }] }),
        ).toBe("radial-gradient(ellipse at 30% 30%, a 0%)");
        expect(
            serializeGradient({ type: "radial", position: "50% 50%", shape: "circle", stops: [{ color: "a", position: 0 }] }),
        ).toBe("radial-gradient(circle at 50% 50%, a 0%)");
    });

    it("serializes a conic gradient, defaulting angle to 0 and position to 50% 50% when omitted", () => {
        expect(serializeGradient({ type: "conic", stops: [{ color: "a", position: 0 }] })).toBe("conic-gradient(from 0deg at 50% 50%, a 0%)");
        expect(serializeGradient({ type: "conic", angle: 90, position: "10% 10%", stops: [{ color: "a", position: 0 }] })).toBe(
            "conic-gradient(from 90deg at 10% 10%, a 0%)",
        );
    });

    it("wraps a stop's color in color-mix() when its opacity is not 1, and leaves opacity:1 stops bare", () => {
        expect(
            serializeGradient({ type: "linear", angle: 0, stops: [{ color: "a", position: 50, opacity: 0.5 }] }),
        ).toBe("linear-gradient(0deg, color-mix(in srgb, a 50%, transparent) 50%)");
        expect(
            serializeGradient({ type: "linear", angle: 0, stops: [{ color: "a", position: 50, opacity: 1 }] }),
        ).toBe("linear-gradient(0deg, a 50%)");
    });

    it("joins a layered gradient's sub-gradients with a comma, each fully serialized on its own", () => {
        expect(
            serializeGradient({
                type: "layered",
                layers: [
                    { type: "radial", position: "0% 0%", stops: [{ color: "a", position: 0 }] },
                    { type: "radial", position: "100% 100%", stops: [{ color: "b", position: 0 }] },
                ],
            }),
        ).toBe("radial-gradient(ellipse at 0% 0%, a 0%), radial-gradient(ellipse at 100% 100%, b 0%)");
    });
});

describe("validateGradientStops", () => {
    const valid = () => ({ hero: { type: "linear" as const, angle: 0, stops: [{ color: "a", position: 0 }, { color: "b", position: 100 }] } });

    it("passes for ordered stops within range", () => {
        expect(() => validateGradientStops(valid())).not.toThrow();
    });

    it("throws when a stop position is out of 0..100", () => {
        expect(() => validateGradientStops({ hero: { type: "linear", angle: 0, stops: [{ color: "a", position: 101 }] } })).toThrow(/out of 0\.\.100/);
        expect(() => validateGradientStops({ hero: { type: "linear", angle: 0, stops: [{ color: "a", position: -1 }] } })).toThrow(/out of 0\.\.100/);
    });

    it("throws when stops are out of order", () => {
        expect(() =>
            validateGradientStops({ hero: { type: "linear", angle: 0, stops: [{ color: "a", position: 60 }, { color: "b", position: 40 }] } }),
        ).toThrow(/out-of-order stops/);
    });

    // Two consecutive stops at the EXACT same position are allowed (a hard
    // color-stop edge, a real CSS idiom) — distinguishes `<` from `<=` in
    // the out-of-order check, which an only-strictly-descending test never
    // would.
    it("allows two consecutive stops at the exact same position (a hard edge)", () => {
        expect(() =>
            validateGradientStops({ hero: { type: "linear", angle: 0, stops: [{ color: "a", position: 40 }, { color: "b", position: 40 }] } }),
        ).not.toThrow();
    });

    it("throws when a stop's opacity is out of 0..1, on EITHER side of the range", () => {
        expect(() =>
            validateGradientStops({ hero: { type: "linear", angle: 0, stops: [{ color: "a", position: 0, opacity: 1.5 }] } }),
        ).toThrow(/opacity out of 0\.\.1/);
        expect(() =>
            validateGradientStops({ hero: { type: "linear", angle: 0, stops: [{ color: "a", position: 0, opacity: -0.5 }] } }),
        ).toThrow(/opacity out of 0\.\.1/);
    });

    // Exact boundary values (0 and 1) must be ACCEPTED, not rejected —
    // distinguishes `<`/`>` from `<=`/`>=` on both ends of the opacity check.
    it("accepts opacity at the exact 0 and 1 boundaries", () => {
        expect(() =>
            validateGradientStops({ hero: { type: "linear", angle: 0, stops: [{ color: "a", position: 0, opacity: 0 }, { color: "b", position: 100, opacity: 1 }] } }),
        ).not.toThrow();
    });

    it("validates every layer of a layered gradient independently, naming which layer failed", () => {
        expect(() =>
            validateGradientStops({
                mesh: {
                    type: "layered",
                    layers: [
                        { type: "radial", position: "0% 0%", stops: [{ color: "a", position: 0 }] },
                        { type: "radial", position: "0% 0%", stops: [{ color: "b", position: 200 }] },
                    ],
                },
            }),
        ).toThrow(/mesh\[1\]/);
    });
});
