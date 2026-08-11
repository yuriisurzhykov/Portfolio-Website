import { smoothPath, type Point } from "./cover-smooth-path";
import { randomInRange, type Prng } from "./cover-seed";
import type { CoverTextStats } from "./cover-text-stats";

/**
 * Flow-curve layer: a handful of smooth, organic lines whose COUNT and
 * AMPLITUDE come from the post's own text (`CoverTextStats`), not just
 * arbitrary randomness — the "title/excerpt actually shape the geometry"
 * requirement confirmed in the `Generative Cover System v3` plan's
 * playground/gallery exploration (`MOOD_B_BOLD`).
 */

/** How many words per curve, roughly — a post with 25 words across title+excerpt gets ~5 curves. */
const WORDS_PER_CURVE = 5;
/** Control points per curve — matches the playground's `flowPoints` default; more points would read as noisier wiggles, fewer would lose the "flowing" shape entirely. */
const CONTROL_POINTS_PER_CURVE = 6;
const LINE_WIDTH = 2;
export const FLOW_OPACITY = 0.5;
/** Base amplitude as a fraction of canvas height, before the text-length adjustment below. */
const AMPLITUDE_HEIGHT_FRACTION = 0.18;
/** How much a longer average word length increases amplitude — an arbitrary but bounded (never more than roughly doubling the base) scaling factor. */
const AMPLITUDE_WORD_LEN_DIVISOR = 8;

export interface FlowCurve {
    points: Point[];
    /** Per-curve opacity multiplier (0.6-1 of `FLOW_OPACITY`) — a small amount of PRNG-driven variety so curves don't all read as identically weighted. */
    opacity: number;
}

/**
 * Builds the raw geometry for every flow curve — pure data, no SVG markup,
 * so it's independently testable and reusable (`cover-letterform.ts` reuses
 * this to fill its clip mask with a denser copy of the same curve family).
 */
export function buildFlowCurves(prng: Prng, stats: CoverTextStats, width: number, height: number): FlowCurve[] {
    const count = Math.max(1, Math.round(stats.wordCount / WORDS_PER_CURVE));
    const amplitude = height * AMPLITUDE_HEIGHT_FRACTION * (0.4 + stats.avgWordLen / AMPLITUDE_WORD_LEN_DIVISOR);

    const curves: FlowCurve[] = [];
    for (let curveIndex = 0; curveIndex < count; curveIndex++) {
        const baseline = randomInRange(prng, 0.1, 0.9) * height;
        const points: Point[] = [];
        for (let pointIndex = 0; pointIndex < CONTROL_POINTS_PER_CURVE; pointIndex++) {
            const x = (pointIndex / (CONTROL_POINTS_PER_CURVE - 1)) * width;
            const wave = Math.sin(pointIndex * (1 + stats.vowelRatio * 3) + curveIndex);
            const y = baseline + wave * amplitude * randomInRange(prng, 0.5, 1);
            points.push({ x, y });
        }
        curves.push({ points, opacity: FLOW_OPACITY * randomInRange(prng, 0.6, 1) });
    }
    return curves;
}

/**
 * Renders ALREADY-BUILT curve data as SVG `<path>` markup — one smoothed
 * stroke per curve, no fill. Kept separate from `buildFlowCurves` (rather
 * than folded together) so `cover-composition.ts` can build the curves
 * ONCE (consuming `prng`) and reuse that exact data both in its own
 * `CoverComposition` record AND when rendering — calling a combined
 * build+render function twice would silently advance `prng` a second time
 * and produce a DIFFERENT, wrong layout the second call.
 */
export function renderFlowCurves(curves: FlowCurve[]): string {
    return curves
        .map((curve) => `<path d="${ smoothPath(curve.points) }" fill="none" stroke="#ffffff" stroke-width="${ LINE_WIDTH }" opacity="${ curve.opacity.toFixed(3) }"/>`)
        .join("");
}

/** Convenience wrapper for standalone use (and this module's own tests): builds and renders in one call. Do NOT use this from `cover-composition.ts` if the curve data is also needed elsewhere — see `renderFlowCurves`'s own comment. */
export function renderFlowLayer(prng: Prng, stats: CoverTextStats, width: number, height: number): string {
    return renderFlowCurves(buildFlowCurves(prng, stats, width, height));
}
