import { describe, expect, it } from "vitest";
import { buildWaveRidges, renderWaveLayer, renderWaveRidges, WAVE_OPACITY } from "./cover-wave";

/**
 * Independently recomputes `buildWaveRidges`'s documented formula from
 * scratch (not by calling the module) — same technique
 * `cover-flow.test.ts`'s `expectedPoint1Y` uses. A loose direction/shape
 * assertion can't distinguish a `*` from a `/` or a `+` from a `-` when a
 * mutant happens to still move the sampled value in a plausible direction;
 * an exact, formula-derived value can.
 */
function expectedRidgeY(text: string, width: number, height: number, ridgeIndex: number, sampleIndex: number, samples = 24): number {
    const codes = [...text.toLowerCase()].map((c) => c.codePointAt(0) ?? 0);
    const safeCodes = codes.length > 0 ? codes : [0];
    const baseline = height * (0.3 + (ridgeIndex / 2) * 0.4); // RIDGE_COUNT fixed at 3 -> denominator is RIDGE_COUNT-1
    const amplitude = height * 0.05 * (1 + ridgeIndex * 0.15);
    const t = sampleIndex / (samples - 1);
    const pos = t * (safeCodes.length - 1);
    const i0 = Math.floor(pos);
    const i1 = Math.min(safeCodes.length - 1, i0 + 1);
    const fraction = pos - i0;
    const value = safeCodes[i0] * (1 - fraction) + safeCodes[i1] * fraction;
    const normalized = (((value + ridgeIndex * 37) % 60) / 60) * 2 - 1;
    return baseline + normalized * amplitude;
}

describe("buildWaveRidges", () => {
    it("always produces exactly 3 ridges, each with 24 points", () => {
        const ridges = buildWaveRidges("Notes on FlowBus", 1200, 630);
        expect(ridges).toHaveLength(3);
        for (const ridge of ridges) {
            expect(ridge.points).toHaveLength(24);
        }
    });

    it("spans every ridge's x from 0 to width", () => {
        const [ridge] = buildWaveRidges("x", 1200, 630);
        expect(ridge.points[0].x).toBe(0);
        expect(ridge.points[ridge.points.length - 1].x).toBe(1200);
    });

    it("pins the exact opacity falloff per ridge: WAVE_OPACITY * (1 - index * 0.12)", () => {
        const [ridge0, ridge1, ridge2] = buildWaveRidges("x", 1200, 630);
        expect(ridge0.opacity).toBeCloseTo(WAVE_OPACITY);
        expect(ridge1.opacity).toBeCloseTo(WAVE_OPACITY * 0.88);
        expect(ridge2.opacity).toBeCloseTo(WAVE_OPACITY * 0.76);
        // Each successive ridge is strictly less opaque than the last.
        expect(ridge1.opacity).toBeLessThan(ridge0.opacity);
        expect(ridge2.opacity).toBeLessThan(ridge1.opacity);
    });

    it("pins the exact first-point y for a known two-character source (golden value from real char codes)", () => {
        // "AB" -> code points [65, 66]; ridge 0's baseline is 0.3*height,
        // amplitude 0.05*height — see this module's own formula. Pinned by
        // computing once and asserting it never silently drifts.
        const [ridge0] = buildWaveRidges("AB", 1200, 630);
        expect(ridge0.points[0].y).toBeCloseTo(196.35, 2);
    });

    it("pins the exact per-ridge amplitude/baseline/offset formula at a fractional sample point, for all 3 ridges", () => {
        // sampleIndex 5 of 24, over a 2-character source, lands on a
        // non-trivial fraction (neither exactly 0 nor 1) — exercising the
        // linear-interpolation arithmetic, not just its two boundary cases.
        const ridges = buildWaveRidges("AB", 1200, 630);
        for (let ridgeIndex = 0; ridgeIndex < 3; ridgeIndex++) {
            expect(ridges[ridgeIndex].points[5].y).toBeCloseTo(expectedRidgeY("AB", 1200, 630, ridgeIndex, 5));
        }
    });

    it("is a pure function of sourceText: identical text always produces identical ridges", () => {
        const a = buildWaveRidges("Notes on FlowBus", 1200, 630);
        const b = buildWaveRidges("Notes on FlowBus", 1200, 630);
        expect(a).toEqual(b);
    });

    it("produces a different waveform for different text", () => {
        const a = buildWaveRidges("Notes on FlowBus", 1200, 630);
        const b = buildWaveRidges("A completely different title", 1200, 630);
        expect(a).not.toEqual(b);
    });

    it("never throws or produces NaN for an empty source string", () => {
        const ridges = buildWaveRidges("", 1200, 630);
        expect(ridges).toHaveLength(3);
        for (const ridge of ridges) {
            for (const point of ridge.points) {
                expect(Number.isNaN(point.x)).toBe(false);
                expect(Number.isNaN(point.y)).toBe(false);
            }
        }
    });

    it("never throws for a single-character source (no interpolation partner)", () => {
        expect(() => buildWaveRidges("A", 1200, 630)).not.toThrow();
    });

    it("keeps every point's y within the ridge's own amplitude band around its baseline", () => {
        const height = 630;
        const ridges = buildWaveRidges("A fairly long and varied piece of source text to sample from", 1200, height);
        ridges.forEach((ridge, ridgeIndex) => {
            const baseline = height * (0.3 + (ridgeIndex / 2) * 0.4);
            const amplitude = height * 0.05 * (1 + ridgeIndex * 0.15);
            for (const point of ridge.points) {
                expect(point.y).toBeGreaterThanOrEqual(baseline - amplitude - 1e-9);
                expect(point.y).toBeLessThanOrEqual(baseline + amplitude + 1e-9);
            }
        });
    });
});

describe("renderWaveRidges", () => {
    it("renders the exact expected markup for a fixed, hand-built ridge list", () => {
        const ridges = [{ points: [{ x: 0, y: 0 }, { x: 10, y: 0 }], opacity: 0.36 }];
        expect(renderWaveRidges(ridges)).toBe(
            '<path d="M 0.00 0.00 C 1.67 0.00, 8.33 0.00, 10.00 0.00" fill="none" stroke="#ffffff" stroke-width="1.6" opacity="0.360"/>',
        );
    });

    it("never throws for an empty ridge list", () => {
        expect(renderWaveRidges([])).toBe("");
    });

    it("joins multiple ridges with no separator between them (kills a mutant that inserts one via .join)", () => {
        const ridges = [
            { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], opacity: 0.1 },
            { points: [{ x: 2, y: 2 }, { x: 3, y: 3 }], opacity: 0.2 },
        ];
        const svg = renderWaveRidges(ridges);
        expect(svg).toContain('/><path d="M 2.00');
    });

    it("is idempotent for the same already-built data (no hidden re-derivation)", () => {
        const ridges = buildWaveRidges("Notes on FlowBus", 1200, 630);
        expect(renderWaveRidges(ridges)).toBe(renderWaveRidges(ridges));
    });
});

describe("renderWaveLayer", () => {
    it("renders exactly 3 <path> elements", () => {
        const svg = renderWaveLayer("Notes on FlowBus", 1200, 630);
        expect((svg.match(/<path /g) ?? []).length).toBe(3);
    });

    it("draws every ridge with no fill (stroke-only)", () => {
        expect(renderWaveLayer("x", 1200, 630)).toContain('fill="none"');
    });

    it("never throws for empty source text", () => {
        expect(() => renderWaveLayer("", 1200, 630)).not.toThrow();
    });
});
