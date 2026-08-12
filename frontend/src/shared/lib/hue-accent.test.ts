import { describe, expect, it } from "vitest";
import { accentColorForHue } from "./hue-accent";

describe("accentColorForHue", () => {
    it("builds an oklch() string at the brand accent's lightness/chroma, varying only hue", () => {
        expect(accentColorForHue(200)).toBe("oklch(0.72 0.17 200)");
    });

    it("reflects a different hue as a different string, not a constant placeholder", () => {
        expect(accentColorForHue(45)).not.toBe(accentColorForHue(200));
    });
});
