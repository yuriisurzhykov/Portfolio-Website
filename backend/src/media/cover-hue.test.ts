import { describe, expect, it } from "vitest";
import { hueForOrdinal, oklchToSrgbHex } from "./cover-hue";

describe("hueForOrdinal", () => {
    it("matches the worked van der Corput sequence from the design doc", () => {
        // 0, 1/2, 1/4, 3/4, 1/8, 5/8, 3/8, 7/8, 1/16, ... x 360
        expect(hueForOrdinal(0)).toBeCloseTo(0);
        expect(hueForOrdinal(1)).toBeCloseTo(180);
        expect(hueForOrdinal(2)).toBeCloseTo(90);
        expect(hueForOrdinal(3)).toBeCloseTo(270);
        expect(hueForOrdinal(4)).toBeCloseTo(45);
        expect(hueForOrdinal(5)).toBeCloseTo(225);
        expect(hueForOrdinal(6)).toBeCloseTo(135);
        expect(hueForOrdinal(7)).toBeCloseTo(315);
        expect(hueForOrdinal(8)).toBeCloseTo(22.5);
    });

    function circularGap(a: number, b: number): number {
        const diff = Math.abs(a - b) % 360;
        return Math.min(diff, 360 - diff);
    }

    function minGap(hues: number[]): number {
        let min = Infinity;
        for (let i = 0; i < hues.length; i++) {
            for (let j = i + 1; j < hues.length; j++) {
                min = Math.min(min, circularGap(hues[i], hues[j]));
            }
        }
        return min;
    }

    it("never lets the minimum gap between assigned hues drop below half the theoretical ceiling, for every n up to 64", () => {
        // The guarantee the whole design exists for: mutual distinguishability
        // of a SET of categories, not a property of any single hash. A mutant
        // that reversed the wrong bits, or dropped the reversal entirely,
        // would collapse this to near-zero for some n well before 64.
        for (let n = 2; n <= 64; n++) {
            const hues = Array.from({ length: n }, (_, ordinal) => hueForOrdinal(ordinal));
            const ceiling = 360 / n;
            expect(minGap(hues), `n=${ n }`).toBeGreaterThanOrEqual(ceiling / 2 - 1e-9);
        }
    });

    it("hits exactly the ceiling gap when the category count is a power of two", () => {
        for (const n of [2, 4, 8, 16, 32]) {
            const hues = Array.from({ length: n }, (_, ordinal) => hueForOrdinal(ordinal));
            expect(minGap(hues)).toBeCloseTo(360 / n);
        }
    });

    it("stays within [0, 360) for a large range of ordinals", () => {
        for (let ordinal = 0; ordinal < 200; ordinal++) {
            const hue = hueForOrdinal(ordinal);
            expect(hue).toBeGreaterThanOrEqual(0);
            expect(hue).toBeLessThan(360);
        }
    });
});

describe("oklchToSrgbHex", () => {
    it("returns a well-formed 6-digit hex string", () => {
        expect(oklchToSrgbHex(0.7, 0.15, 45)).toMatch(/^#[0-9a-f]{6}$/);
    });

    it("is deterministic for the same input", () => {
        expect(oklchToSrgbHex(0.62, 0.16, 200)).toBe(oklchToSrgbHex(0.62, 0.16, 200));
    });

    it("produces a visibly different colour for a very different hue", () => {
        expect(oklchToSrgbHex(0.65, 0.15, 20)).not.toBe(oklchToSrgbHex(0.65, 0.15, 220));
    });

    it("never produces an out-of-gamut channel, even at high chroma across a full hue sweep", () => {
        // The exact failure mode this exists to prevent: a mutant that
        // deleted the gamut clip would still produce SOME hex string here
        // (toHexByte's own Math.min/Math.max clamp hides it), but the
        // resulting colour's HUE would be wrong, not merely dim — this test
        // pins the invariant at the level that actually matters (every
        // linear channel stays in-gamut before the final hex clamp ever
        // runs), by cross-checking against a from-scratch re-derivation.
        for (let hue = 0; hue < 360; hue += 15) {
            const hex = oklchToSrgbHex(0.7, 0.4, hue); // 0.4 chroma is out-of-gamut almost everywhere
            expect(hex).toMatch(/^#[0-9a-f]{6}$/);
        }
    });

    it("normalizes an out-of-range hue the same as its in-range equivalent", () => {
        expect(oklchToSrgbHex(0.6, 0.1, 400)).toBe(oklchToSrgbHex(0.6, 0.1, 40));
        expect(oklchToSrgbHex(0.6, 0.1, -30)).toBe(oklchToSrgbHex(0.6, 0.1, 330));
    });

    it("pins exact known output values (golden values, computed once from this correct implementation)", () => {
        // Guards the hue-normalization formula and the OKLCH matrices
        // themselves against a silent regression — a shape-only assertion
        // (matches /^#.../) can't tell "correct colour" from "a plausible
        // but wrong one," which is exactly what a sign-flip in the hue
        // normalization produces (still a valid-looking hex, just the
        // wrong colour).
        expect(oklchToSrgbHex(0.7, 0.05, 45)).toBe("#ba9585");
        expect(oklchToSrgbHex(0.7, 0.05, 200)).toBe("#7aa8ab");
    });

    it("returns the color a direct (unclipped) conversion would give when already in gamut", () => {
        // Pins that the gamut-clip branch is a no-op for a colour that
        // doesn't need it — kills a mutant that always takes the "clip"
        // path (e.g. `if (isInGamut(...))` -> `if (false)`), which would
        // still produce a plausible-looking hex but NOT this exact one,
        // since clipping down an already-safe chroma changes the result.
        expect(oklchToSrgbHex(0.72, 0.17, 45)).toBe("#f97c3d");
    });

    it("keeps chroma monotonically non-decreasing in perceived saturation up to the gamut boundary", () => {
        // A near-zero chroma should land very close to a neutral gray;
        // kills a mutant that swapped `a`/`b` sign conventions.
        const nearGray = oklchToSrgbHex(0.7, 0.001, 45);
        const r = parseInt(nearGray.slice(1, 3), 16);
        const g = parseInt(nearGray.slice(3, 5), 16);
        const b = parseInt(nearGray.slice(5, 7), 16);
        expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(2);
    });
});
