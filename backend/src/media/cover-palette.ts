import { oklchToSrgbHex } from "./cover-hue";
import { randomInRange, type Prng } from "./cover-seed";

/**
 * Lightness/chroma tokens — FIXED across every cover so only hue (identity,
 * from the category) and layout (variety, from the per-post seed) ever
 * change; a cover can never accidentally render too dark, too pale, or
 * radioactively oversaturated. Values are the "Bold" mood confirmed live in
 * the `Generative Cover System v3` plan's interactive playground/gallery
 * (`MOOD_B_BOLD`) — lighter and more saturated than v1's mesh gradient
 * (`BASE_LIGHTNESS` was 0.2, `SPOT_LIGHTNESS` was 0.62), matched to how the
 * new mesh renders with `overlay` blending (`cover-composition.ts`) rather
 * than v1's plain alpha-stacked spots.
 *
 * Two roles, not one shared value: `BASE_*` is the canvas every spot sits
 * on top of (this is what makes the cover read as a mesh gradient rather
 * than a wash of one flat colour); `SPOT_*` is the vivid colour of each
 * blurred blob.
 */
export const BASE_LIGHTNESS = 0.39;
export const BASE_CHROMA = 0.07;
export const SPOT_LIGHTNESS = 0.8;
export const SPOT_CHROMA = 0.16;

/**
 * How far a spot's hue may drift from the category's own hue — deliberately
 * NARROW (was 20-40° in v1). Found live, not guessed: a wider spread (this
 * module briefly went as high as 45-120° during playground exploration)
 * let a "purple" category's spots drift far enough to visibly read as
 * "pink" or "blue" instead, because OKLCH's in-gamut sRGB region is uneven
 * across hues — the magenta/violet zone crosses into a different NAMED
 * colour after a much smaller hue delta than, say, the green zone does. See
 * the plan's "Как мы сюда пришли" section for the exact user-reported
 * symptom this fixes.
 */
export const MIN_HUE_SPREAD_DEG = 16;
export const MAX_HUE_SPREAD_DEG = 17;

export interface CoverPalette {
    /** The muted, low-chroma canvas colour every spot sits on top of. */
    base: string;
    /** `spotCount` vivid, related-hue colours — one per mesh-gradient spot, see `cover-composition.ts`. */
    spots: string[];
}

/**
 * Builds the concrete sRGB colours for one cover. `categoryHue` decides
 * IDENTITY (which family of hues this cover belongs to — every post in the
 * same category shares it); `prng` decides VARIETY (exactly how far each
 * spot drifts from that hue, and in which direction) — the same identity/
 * variety split `cover-composition.ts` follows for layout. Two posts in the
 * same category therefore always share a hue family, but never render an
 * identical palette, since `prng` is seeded from the POST's own slug, not
 * the category (see `image-generator.ts`).
 */
export function buildCoverPalette(categoryHue: number, prng: Prng, spotCount: number): CoverPalette {
    const spots = Array.from({ length: spotCount }, () => {
        const spread = randomInRange(prng, MIN_HUE_SPREAD_DEG, MAX_HUE_SPREAD_DEG);
        const sign = prng() < 0.5 ? -1 : 1;
        return oklchToSrgbHex(SPOT_LIGHTNESS, SPOT_CHROMA, categoryHue + sign * spread);
    });

    return {
        base: oklchToSrgbHex(BASE_LIGHTNESS, BASE_CHROMA, categoryHue),
        spots,
    };
}
