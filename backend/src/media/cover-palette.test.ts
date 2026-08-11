import { describe, expect, it } from "vitest";
import { oklchToSrgbHex } from "./cover-hue";
import { BASE_CHROMA, BASE_LIGHTNESS, buildCoverPalette, SPOT_CHROMA, SPOT_LIGHTNESS } from "./cover-palette";
import { prngFromSeed, type Prng } from "./cover-seed";

/** A `Prng` that replays a fixed, known sequence — lets a test pin the EXACT colour `buildCoverPalette` derives, rather than only checking shape. */
function sequencePrng(values: number[]): Prng {
    let index = 0;
    return () => values[index++ % values.length];
}

describe("buildCoverPalette", () => {
    it("derives the base colour directly from the category hue, at the fixed base lightness/chroma", () => {
        const palette = buildCoverPalette(180, sequencePrng([0]), 0);
        expect(palette.base).toBe(oklchToSrgbHex(BASE_LIGHTNESS, BASE_CHROMA, 180));
    });

    it("returns exactly `spotCount` spots", () => {
        expect(buildCoverPalette(45, prngFromSeed("x"), 4).spots).toHaveLength(4);
        expect(buildCoverPalette(45, prngFromSeed("x"), 0).spots).toHaveLength(0);
    });

    it("pins the exact spread/sign math for a known PRNG sequence", () => {
        // randomInRange(prng, 20, 40) with a first draw of 0.5 -> 20 + 0.5*20 = 30.
        // The second draw (0.2 < 0.5) selects the NEGATIVE sign.
        const palette = buildCoverPalette(180, sequencePrng([0.5, 0.2]), 1);
        expect(palette.spots[0]).toBe(oklchToSrgbHex(SPOT_LIGHTNESS, SPOT_CHROMA, 180 - 30));
    });

    it("flips to the positive sign when the second draw is >= 0.5", () => {
        const palette = buildCoverPalette(180, sequencePrng([0.5, 0.9]), 1);
        expect(palette.spots[0]).toBe(oklchToSrgbHex(SPOT_LIGHTNESS, SPOT_CHROMA, 180 + 30));
    });

    it("treats exactly 0.5 as the positive-sign boundary (< 0.5, not <=)", () => {
        // Kills a mutant that flips `< 0.5` to `<= 0.5` — indistinguishable
        // from the test above unless the draw lands EXACTLY on the boundary.
        const palette = buildCoverPalette(180, sequencePrng([0.5, 0.5]), 1);
        expect(palette.spots[0]).toBe(oklchToSrgbHex(SPOT_LIGHTNESS, SPOT_CHROMA, 180 + 30));
    });

    it("never drifts a spot's hue by more than the maximum spread (40°) from the category hue", () => {
        // Exhaustive over the PRNG's own output range rather than a handful
        // of samples — kills a mutant that widened MAX_HUE_SPREAD_DEG or
        // dropped the upper bound check in randomInRange.
        for (let draw = 0; draw <= 1; draw += 0.05) {
            const palette = buildCoverPalette(0, sequencePrng([draw, 0]), 1);
            const negative = oklchToSrgbHex(SPOT_LIGHTNESS, SPOT_CHROMA, 0 - (20 + draw * 20));
            expect(palette.spots[0]).toBe(negative);
        }
    });

    it("produces a real, deterministic palette from a real seeded PRNG", () => {
        const first = buildCoverPalette(200, prngFromSeed("flowbus"), 4);
        const second = buildCoverPalette(200, prngFromSeed("flowbus"), 4);
        expect(first).toEqual(second);
        expect(first.spots.every((spot) => /^#[0-9a-f]{6}$/.test(spot))).toBe(true);
    });
});
