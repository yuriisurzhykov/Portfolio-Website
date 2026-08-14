import { describe, expect, it } from "vitest";
import { buildFlowCurves, FLOW_OPACITY, renderFlowCurves, renderFlowLayer } from "./cover-flow";
import { prngFromSeed, type Prng } from "./cover-seed";
import type { CoverTextStats } from "./cover-text-stats";

function sequencePrng(values: number[]): Prng {
    let index = 0;
    return () => values[index++ % values.length];
}

function stats(overrides: Partial<CoverTextStats> = {}): CoverTextStats {
    return { wordCount: 10, avgWordLen: 5, vowelRatio: 0.4, ...overrides };
}

describe("buildFlowCurves", () => {
    it("pins the exact curve-count formula: round(wordCount / 5), minimum 1", () => {
        expect(buildFlowCurves(prngFromSeed("x"), stats({ wordCount: 0 }), 1200, 630)).toHaveLength(1);
        expect(buildFlowCurves(prngFromSeed("x"), stats({ wordCount: 2 }), 1200, 630)).toHaveLength(1); // round(0.4) = 0 -> clamped to 1
        expect(buildFlowCurves(prngFromSeed("x"), stats({ wordCount: 3 }), 1200, 630)).toHaveLength(1); // round(0.6) = 1
        expect(buildFlowCurves(prngFromSeed("x"), stats({ wordCount: 13 }), 1200, 630)).toHaveLength(3); // round(2.6) = 3
        expect(buildFlowCurves(prngFromSeed("x"), stats({ wordCount: 50 }), 1200, 630)).toHaveLength(10);
    });

    it("gives every curve exactly 6 control points, spanning x from 0 to width", () => {
        const [curve] = buildFlowCurves(prngFromSeed("x"), stats(), 1200, 630);
        expect(curve.points).toHaveLength(6);
        expect(curve.points[0].x).toBe(0);
        expect(curve.points[5].x).toBe(1200);
    });

    it("pins the exact baseline formula at the PRNG's minimum draw (every draw returns 0)", () => {
        // At pointIndex 0, sin(0 * anything) = 0, so y is exactly the
        // baseline with no wave contribution — a clean assertion point that
        // avoids hand-computing trig for the rest of the curve.
        const [curve] = buildFlowCurves(sequencePrng([0]), stats(), 1200, 630);
        expect(curve.points[0].y).toBeCloseTo(0.1 * 630);
    });

    it("pins the exact baseline formula at the PRNG's maximum-ish draw", () => {
        const [curve] = buildFlowCurves(sequencePrng([0.999999]), stats(), 1200, 630);
        expect(curve.points[0].y).toBeCloseTo(0.9 * 630, 1);
    });

    it("scales amplitude up for a longer average word length", () => {
        // Same PRNG sequence, only avgWordLen differs -> only the wave
        // contribution (not the baseline) should differ, and only at a
        // point where the wave term is non-zero (pointIndex 1).
        const short = buildFlowCurves(sequencePrng([0.5, 1, 0.5, 1]), stats({ avgWordLen: 1 }), 1200, 630)[0];
        const long = buildFlowCurves(sequencePrng([0.5, 1, 0.5, 1]), stats({ avgWordLen: 20 }), 1200, 630)[0];
        const shortWaveContribution = Math.abs(short.points[1].y - short.points[0].y);
        const longWaveContribution = Math.abs(long.points[1].y - long.points[0].y);
        expect(longWaveContribution).toBeGreaterThan(shortWaveContribution);
    });

    /**
     * Precise, formula-derived pins for `buildFlowCurves`'s point-1 y value
     * — independently recomputed here from the module's own documented
     * formula (baseline + wave*amplitude*multiplier), the same technique
     * `cover-composition.test.ts`'s `expectedGrainDots` helper uses. A
     * loose ">"-direction assertion (like the test above) can't tell a `+`
     * from a `-` or a `*` from a `/` when both still move the value in the
     * same direction for the chosen inputs — these exact-value pins can,
     * and killed a real batch of surviving arithmetic-operator mutants in
     * this exact function (see the dated README entry).
     */
    function expectedPoint1Y(height: number, avgWordLen: number, vowelRatio: number, curveIndex: number): number {
        const baseline = 0.1 * height; // randomInRange(prng, 0.1, 0.9) at draw=0
        const amplitude = height * 0.18 * (0.4 + avgWordLen / 8);
        const wave = Math.sin(1 * (1 + vowelRatio * 3) + curveIndex);
        const multiplier = 0.5; // randomInRange(prng, 0.5, 1) at draw=0
        return baseline + wave * amplitude * multiplier;
    }

    it("pins the exact amplitude formula's effect on point 1's y (avgWordLen term)", () => {
        const flat = buildFlowCurves(sequencePrng([0]), stats({ wordCount: 5, avgWordLen: 0, vowelRatio: 0 }), 1200, 630);
        const long = buildFlowCurves(sequencePrng([0]), stats({ wordCount: 5, avgWordLen: 8, vowelRatio: 0 }), 1200, 630);
        expect(flat[0].points[1].y).toBeCloseTo(expectedPoint1Y(630, 0, 0, 0));
        expect(long[0].points[1].y).toBeCloseTo(expectedPoint1Y(630, 8, 0, 0));
    });

    it("pins the exact vowelRatio term's effect on the sin() argument", () => {
        const noVowels = buildFlowCurves(sequencePrng([0]), stats({ wordCount: 5, avgWordLen: 0, vowelRatio: 0 }), 1200, 630);
        const halfVowels = buildFlowCurves(sequencePrng([0]), stats({ wordCount: 5, avgWordLen: 0, vowelRatio: 0.5 }), 1200, 630);
        expect(noVowels[0].points[1].y).toBeCloseTo(expectedPoint1Y(630, 0, 0, 0));
        expect(halfVowels[0].points[1].y).toBeCloseTo(expectedPoint1Y(630, 0, 0.5, 0));
    });

    it("pins the exact curveIndex term's sign (added, not subtracted) for the second curve", () => {
        const curves = buildFlowCurves(sequencePrng([0]), stats({ wordCount: 10, avgWordLen: 0, vowelRatio: 0 }), 1200, 630);
        expect(curves).toHaveLength(2);
        expect(curves[1].points[1].y).toBeCloseTo(expectedPoint1Y(630, 0, 0, 1));
    });

    it("keeps each curve's opacity within [0.6, 1] of FLOW_OPACITY", () => {
        for (let draw = 0; draw <= 1; draw += 0.1) {
            // The opacity multiplier is drawn AFTER the baseline+6 point draws, so seed a long sequence with the multiplier at the right position via a real PRNG sweep instead.
            const curves = buildFlowCurves(prngFromSeed(`opacity-${ draw }`), stats({ wordCount: 5 }), 1200, 630);
            for (const curve of curves) {
                expect(curve.opacity).toBeGreaterThanOrEqual(FLOW_OPACITY * 0.6 - 1e-9);
                expect(curve.opacity).toBeLessThanOrEqual(FLOW_OPACITY);
            }
        }
    });

    it("is byte-for-byte deterministic for the same seed and stats", () => {
        const a = buildFlowCurves(prngFromSeed("flowbus"), stats(), 1200, 630);
        const b = buildFlowCurves(prngFromSeed("flowbus"), stats(), 1200, 630);
        expect(a).toEqual(b);
    });

    it("produces a different layout for a different seed", () => {
        const a = buildFlowCurves(prngFromSeed("flowbus"), stats(), 1200, 630);
        const b = buildFlowCurves(prngFromSeed("testing-culture"), stats(), 1200, 630);
        expect(a).not.toEqual(b);
    });
});

describe("renderFlowCurves", () => {
    it("renders the exact expected markup for a fixed, hand-built curve list", () => {
        const curves = [{ points: [{ x: 0, y: 0 }, { x: 10, y: 0 }], opacity: 0.5 }];
        expect(renderFlowCurves(curves)).toBe(
            '<path d="M 0.00 0.00 C 1.67 0.00, 8.33 0.00, 10.00 0.00" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.500"/>',
        );
    });

    it("renders one <path> per curve and never throws for an empty list", () => {
        expect(renderFlowCurves([])).toBe("");
        const curves = [
            { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], opacity: 0.5 },
            { points: [{ x: 2, y: 2 }, { x: 3, y: 3 }], opacity: 0.3 },
        ];
        expect((renderFlowCurves(curves).match(/<path /g) ?? []).length).toBe(2);
        // Joined with no separator — a `.match().length` count alone
        // wouldn't notice an inserted separator string between elements.
        expect(renderFlowCurves(curves)).toContain('/><path d="M 2.00');
    });

    it("does NOT re-derive curves from a PRNG — calling it twice on the same data is idempotent", () => {
        const curves = buildFlowCurves(prngFromSeed("idempotent-check"), stats(), 1200, 630);
        expect(renderFlowCurves(curves)).toBe(renderFlowCurves(curves));
    });
});

describe("renderFlowLayer", () => {
    it("renders exactly one <path> per curve", () => {
        const svg = renderFlowLayer(prngFromSeed("count-check"), stats({ wordCount: 20 }), 1200, 630);
        const curves = buildFlowCurves(prngFromSeed("count-check"), stats({ wordCount: 20 }), 1200, 630);
        expect((svg.match(/<path /g) ?? []).length).toBe(curves.length);
    });

    it("never throws for the degenerate single-curve case", () => {
        expect(() => renderFlowLayer(prngFromSeed("x"), stats({ wordCount: 0 }), 1200, 630)).not.toThrow();
    });

    it("draws every curve with no fill (stroke-only)", () => {
        const svg = renderFlowLayer(prngFromSeed("x"), stats(), 1200, 630);
        expect(svg).toContain('fill="none"');
    });
});
