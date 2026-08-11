import { oklchToSrgbHex } from "./cover-hue";
import { randomInRange, type Prng } from "./cover-seed";

/**
 * Lightness/chroma tokens — FIXED across every cover so only hue (identity,
 * from the category) and layout (variety, from the per-post seed) ever
 * change; a cover can never accidentally render too dark, too pale, or
 * radioactively oversaturated. Same OKLCH "family" as the design system's
 * own accent token (`frontend/src/shared/ui/theme/tokens.ts`'s
 * `palette.accent = oklch(0.72 0.17 45)`) — picked independently here
 * rather than imported, since `backend/` has no dependency on `frontend/`'s
 * token file (this package produces server-rendered SVG bytes, not app UI).
 *
 * Two roles, not one shared value: `BASE_*` is the dark, low-chroma canvas
 * every spot sits on top of (this is what makes the cover read as a mesh
 * gradient rather than a wash of one flat colour); `SPOT_*` is the vivid
 * colour of each blurred blob.
 */
export const BASE_LIGHTNESS = 0.2;
export const BASE_CHROMA = 0.05;
export const SPOT_LIGHTNESS = 0.62;
export const SPOT_CHROMA = 0.16;

/**
 * How far a spot's hue may drift from the category's own hue. Wide enough
 * that several spots read as distinct colour zones, never so wide that
 * mixing two of them crosses into muddy territory — OKLCH keeps a wide hue
 * spread looking clean far better than RGB does, but a mesh gradient still
 * only reads as ONE family of colour within a bounded spread (see
 * `media/README.md`'s "Алгоритм" section).
 */
const MIN_HUE_SPREAD_DEG = 20;
const MAX_HUE_SPREAD_DEG = 40;

export interface CoverPalette {
    /** The dark, low-chroma canvas colour every spot sits on top of. */
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
