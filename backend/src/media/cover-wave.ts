import { smoothPath, type Point } from "./cover-smooth-path";

/**
 * Waveform layer: a small stack of smooth "ridgeline" curves built directly
 * from the character codes of the post's own title+excerpt — literally
 * turning the text into a shape, not just using it to seed otherwise
 * arbitrary randomness. Deliberately NOT PRNG-driven (no `Prng` parameter):
 * the whole point is that the SAME text always produces the SAME wave,
 * with no dependency on `slug`/`variant` at all.
 */

const RIDGE_COUNT = 3;
export const WAVE_OPACITY = 0.36;
const SAMPLES_PER_RIDGE = 24;
const LINE_WIDTH = 1.6;
/** Base ridge amplitude as a fraction of canvas height. */
const AMPLITUDE_HEIGHT_FRACTION = 0.05;
/** Modulus applied to each sampled character code before normalizing — deliberately small (60, not e.g. 256) so consecutive samples don't jump wildly even for very different adjacent characters, keeping the curve looking like a "waveform" rather than noise. */
const CODE_MODULUS = 60;

export interface WaveRidge {
    points: Point[];
    opacity: number;
}

function charCodesOf(text: string): number[] {
    const codes = [...text.toLowerCase()].map((character) => character.codePointAt(0) ?? 0);
    return codes.length > 0 ? codes : [0];
}

/**
 * Builds the raw geometry for every ridge — pure data, independently
 * testable and reused by `renderWaveLayer` for the actual markup.
 * `sourceText` is sampled with linear interpolation between adjacent
 * character codes (`i0`/`i1`/`frac` below) so `SAMPLES_PER_RIDGE` points
 * are always produced regardless of how many characters `sourceText` has —
 * a one-word title and a full sentence both produce an equally smooth
 * curve, not a jagged one for short input.
 */
export function buildWaveRidges(sourceText: string, width: number, height: number): WaveRidge[] {
    const codes = charCodesOf(sourceText);
    const ridges: WaveRidge[] = [];

    for (let ridgeIndex = 0; ridgeIndex < RIDGE_COUNT; ridgeIndex++) {
        const baseline = height * (0.3 + (ridgeIndex / Math.max(1, RIDGE_COUNT - 1)) * 0.4);
        const amplitude = height * AMPLITUDE_HEIGHT_FRACTION * (1 + ridgeIndex * 0.15);

        const points: Point[] = [];
        for (let sampleIndex = 0; sampleIndex < SAMPLES_PER_RIDGE; sampleIndex++) {
            const t = sampleIndex / (SAMPLES_PER_RIDGE - 1);
            const position = t * (codes.length - 1);
            const i0 = Math.floor(position);
            const i1 = Math.min(codes.length - 1, i0 + 1);
            const fraction = position - i0;
            const value = codes[i0] * (1 - fraction) + codes[i1] * fraction;
            const normalized = (((value + ridgeIndex * 37) % CODE_MODULUS) / CODE_MODULUS) * 2 - 1;
            points.push({ x: t * width, y: baseline + normalized * amplitude });
        }

        ridges.push({ points, opacity: WAVE_OPACITY * (1 - ridgeIndex * 0.12) });
    }

    return ridges;
}

/** Renders ALREADY-BUILT ridge data as SVG `<path>` markup — kept separate from `buildWaveRidges` for the same reason `cover-flow.ts`'s `renderFlowCurves` is: `cover-composition.ts` builds every layer's data once and reuses it for both its own `CoverComposition` record and rendering. */
export function renderWaveRidges(ridges: WaveRidge[]): string {
    return ridges
        .map((ridge) => `<path d="${ smoothPath(ridge.points) }" fill="none" stroke="#ffffff" stroke-width="${ LINE_WIDTH }" opacity="${ ridge.opacity.toFixed(3) }"/>`)
        .join("");
}

/** Convenience wrapper for standalone use (and this module's own tests): builds and renders in one call. */
export function renderWaveLayer(sourceText: string, width: number, height: number): string {
    return renderWaveRidges(buildWaveRidges(sourceText, width, height));
}
