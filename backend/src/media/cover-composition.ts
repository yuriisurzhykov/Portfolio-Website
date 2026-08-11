import { buildCoverPalette } from "./cover-palette";
import { prngFromSeed, randomInRange, randomInt, type Prng } from "./cover-seed";

/** Canonical cover pixel size — Open Graph's own 1200x630, reused here so the same aspect ratio holds all the way from the vector source to the final raster (`image-processing.ts`). */
export const COVER_WIDTH = 1200;
export const COVER_HEIGHT = 630;

const MIN_SPOTS = 3;
const MAX_SPOTS = 5;

interface CoverSpot {
    cx: number;
    cy: number;
    r: number;
    color: string;
}

export interface CoverComposition {
    base: string;
    spots: CoverSpot[];
    /** Seeds the grain-tile dot layout (see `renderCoverSvg`) — one of the few things that varies purely for texture, independent of the colour/layout identity above. */
    grainSeed: number;
}

/**
 * Deterministic layout for one cover: how many spots (3-5), where each one
 * sits, how large it is, and its colour (via `cover-palette.ts`). `prng`
 * alone decides every value here, drawn in a FIXED order — given the exact
 * same `Prng` sequence (i.e. the same seed string, see `image-generator.ts`)
 * this returns byte-for-byte the same composition, which is what
 * `renderCoverSvg`'s determinism test pins end to end.
 *
 * Spot count and category hue are pure inputs; position/radius/hue-drift are
 * everything that makes two posts in the SAME category look like siblings,
 * not clones — see `media/README.md`'s "Алгоритм" section.
 */
export function buildCoverComposition(categoryHue: number, prng: Prng): CoverComposition {
    const spotCount = randomInt(prng, MIN_SPOTS, MAX_SPOTS);
    const palette = buildCoverPalette(categoryHue, prng, spotCount);

    const spots: CoverSpot[] = palette.spots.map((color) => ({
        // Kept away from the exact edges (10-90% of each axis) so a spot's
        // soft-gradient falloff has room to read as a rounded blob rather
        // than visibly clipping against the canvas edge.
        cx: randomInRange(prng, 0.1, 0.9) * COVER_WIDTH,
        cy: randomInRange(prng, 0.15, 0.85) * COVER_HEIGHT,
        // Wide, heavily overlapping radii — this is what makes the result
        // read as one continuous mesh instead of a few isolated dots with a
        // visible seam of bare base colour between them (found by actually
        // rendering a sample cover and looking at it, not assumed: a
        // narrower 0.32-0.5 range left a hard-edged gap between two spots).
        r: randomInRange(prng, 0.55, 0.75) * COVER_WIDTH,
        color,
    }));

    return {
        base: palette.base,
        spots,
        grainSeed: randomInt(prng, 1, 1_000_000),
    };
}

// ---------------------------------------------------------------------------
// SVG rendering.
//
// Deliberately NO `feGaussianBlur`/`feTurbulence` anywhere below — librsvg
// (sharp's built-in SVG rasterizer, see `image-processing.ts`) does not
// render either identically to a browser, and this feature's whole premise
// is ONE canonical raster computed once on the server (see
// `media/README.md`'s "Гейт на первый день" entry). Every soft edge here is
// a wide multi-stop `<radialGradient>` (the same technique the design
// system's own CSS `meshGradient` token already uses — see
// `frontend/src/shared/ui/theme/tokens.ts`), and the grain texture is a
// small tiled `<pattern>` of plain, hard-edged dots — both render
// byte-for-byte identically in every SVG implementation, because neither
// uses a raster filter at all.
// ---------------------------------------------------------------------------

const GRAIN_TILE_SIZE = 10;
const GRAIN_DOTS_PER_TILE = 5;

function escapeXmlAttribute(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function renderSpotGradient(spot: CoverSpot, index: number): string {
    const id = `spot-${ index }`;
    const color = escapeXmlAttribute(spot.color);
    // Four stops, not two — a long, gentle tail (55%/85% at 1/3 and 1/10
    // opacity) is what actually reads as "softly blurred" using only
    // gradient stops (no `feGaussianBlur`, see this module's top comment);
    // a shorter falloff left a visible ring where one spot's gradient ended
    // and the base colour showed through starkly, found the same way as
    // the radius tuning above — by rendering a sample and looking at it.
    return `<radialGradient id="${ id }" cx="50%" cy="50%" r="50%">` +
        `<stop offset="0%" stop-color="${ color }" stop-opacity="0.9"/>` +
        `<stop offset="35%" stop-color="${ color }" stop-opacity="0.6"/>` +
        `<stop offset="65%" stop-color="${ color }" stop-opacity="0.28"/>` +
        `<stop offset="100%" stop-color="${ color }" stop-opacity="0"/>` +
        "</radialGradient>";
}

function renderSpotCircle(spot: CoverSpot, index: number): string {
    return `<circle cx="${ spot.cx.toFixed(2) }" cy="${ spot.cy.toFixed(2) }" r="${ spot.r.toFixed(2) }" fill="url(#spot-${ index })"/>`;
}

/**
 * A small tiled dot pattern standing in for `feTurbulence` grain — see this
 * module's top comment for why. Re-seeded from `grainSeed` alone via
 * `prngFromSeed` (not the composition's own PRNG instance, which is long
 * exhausted by the time rendering runs) — reusing the exact same primitive
 * the rest of this slice uses, rather than a second hash algorithm, is what
 * keeps "deterministic" meaning the same thing everywhere in this file.
 */
function renderGrainPattern(grainSeed: number): string {
    const prng = prngFromSeed(String(grainSeed));
    const dots = Array.from({ length: GRAIN_DOTS_PER_TILE }, () => {
        const cx = randomInRange(prng, 0.5, GRAIN_TILE_SIZE - 0.5);
        const cy = randomInRange(prng, 0.5, GRAIN_TILE_SIZE - 0.5);
        const opacity = randomInRange(prng, 0.02, 0.06);
        return `<circle cx="${ cx.toFixed(2) }" cy="${ cy.toFixed(2) }" r="0.6" fill="#ffffff" opacity="${ opacity.toFixed(3) }"/>`;
    }).join("");

    return `<pattern id="grain" width="${ GRAIN_TILE_SIZE }" height="${ GRAIN_TILE_SIZE }" patternUnits="userSpaceOnUse">${ dots }</pattern>`;
}

/**
 * Renders `composition` to a complete, standalone SVG document — the
 * `ProceduralImageGenerator`'s entire output (see `image-generator.ts`).
 * Pure and total: every input composition, including the degenerate
 * `spots: []` case, produces a valid SVG string (a bare base-colour fill),
 * never throws.
 */
export function renderCoverSvg(composition: CoverComposition): string {
    const spotGradients = composition.spots.map(renderSpotGradient).join("");
    const spotCircles = composition.spots.map(renderSpotCircle).join("");

    return (
        `<svg width="${ COVER_WIDTH }" height="${ COVER_HEIGHT }" viewBox="0 0 ${ COVER_WIDTH } ${ COVER_HEIGHT }" ` +
        `xmlns="http://www.w3.org/2000/svg">` +
        "<defs>" +
        spotGradients +
        renderGrainPattern(composition.grainSeed) +
        `<radialGradient id="vignette" cx="50%" cy="50%" r="72%">` +
        `<stop offset="55%" stop-color="#000000" stop-opacity="0"/>` +
        `<stop offset="100%" stop-color="#000000" stop-opacity="0.4"/>` +
        "</radialGradient>" +
        "</defs>" +
        `<rect width="${ COVER_WIDTH }" height="${ COVER_HEIGHT }" fill="${ escapeXmlAttribute(composition.base) }"/>` +
        spotCircles +
        `<rect width="${ COVER_WIDTH }" height="${ COVER_HEIGHT }" fill="url(#grain)"/>` +
        `<rect width="${ COVER_WIDTH }" height="${ COVER_HEIGHT }" fill="url(#vignette)"/>` +
        "</svg>"
    );
}
