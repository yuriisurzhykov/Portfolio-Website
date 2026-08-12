import { buildFlowCurves, renderFlowCurves, type FlowCurve } from "./cover-flow";
import { renderFontFaceStyle } from "./cover-font-face";
import type { CoverFonts } from "./cover-fonts";
import { buildLetterformClip, renderLetterformClipDef, renderLetterformLayer, type LetterformClip } from "./cover-letterform";
import { buildCoverPalette, BASE_LIGHTNESS } from "./cover-palette";
import { randomInRange, type Prng } from "./cover-seed";
import { buildStampText, renderStampText } from "./cover-stamp";
import { createTextMeasurer } from "./cover-text-measure";
import { firstWordOf, statsFor } from "./cover-text-stats";
import { buildTitleTextLayout, renderTitleTextLayer, TITLE_TEXT_FONT_SIZE, type TitleTextLayout } from "./cover-title-text";
import { escapeXmlAttribute } from "./cover-xml";
import { buildWaveRidges, renderWaveRidges, type WaveRidge } from "./cover-wave";

/**
 * The v3 ("Organic", Bold mood) assembler — six layers, all confirmed live
 * against real `sharp`/librsvg rasterization and real user feedback across
 * three rounds of an interactive browser playground and a 12-category
 * comparison gallery (see the `Generative Cover System v3` plan). Replaces
 * the v1 "one mesh gradient" design entirely: `renderCoverSvg` now takes a
 * fully-resolved `CoverComposition` PLUS the embedded font bytes, instead
 * of a gradient-only data object.
 */

/** Canonical cover pixel size — Open Graph's own 1200x630. */
export const COVER_WIDTH = 1200;
export const COVER_HEIGHT = 630;

/** Fixed spot count — v1 randomized this (3-5); the approved Bold mood uses a fixed, denser count instead, since variety now comes from flow/wave/letterform/title-text, not from how many mesh spots there are. */
const SPOT_COUNT = 8;
/** Spot radius as a fraction of canvas width — deliberately the SAME for every spot (not randomized per spot), unlike v1. */
const SPOT_RADIUS_FRACTION = 0.48;
const SPOT_OPACITY = 1;
/** How far the extra two gradient stops sit (as a 0-1 "softness" fraction) — see `renderSpotGradient`'s own comment for the exact stop-position formula this drives. Fixed at 1 (maximum softness) in the approved Bold mood. */
const SPOT_SOFTNESS = 1;
/** Confirmed live (Day-0 gate, precise pixel-level check, not eyeballing) to be honoured by librsvg — see the plan's own gate section. */
const MESH_BLEND_MODE = "overlay";
const VIGNETTE_OPACITY = 0.22;

export interface CoverSpot {
    cx: number;
    cy: number;
    r: number;
    color: string;
}

/**
 * Everything needed to render one cover, fully resolved — every random
 * draw already made, every text already wrapped/measured. `renderCoverSvg`
 * does no further decision-making, only string assembly, which is what
 * lets a test hand-build one of these directly (see
 * `cover-composition.test.ts`'s exact-markup test) without going through
 * `buildCoverComposition` (and therefore without needing a real `Prng` or
 * real font bytes) at all.
 */
export interface CoverComposition {
    base: string;
    spots: CoverSpot[];
    flowCurves: FlowCurve[];
    waveRidges: WaveRidge[];
    letterformClip: LetterformClip;
    titleTextLayout: TitleTextLayout | null;
    stampText: string;
}

export interface CoverCompositionInput {
    categoryHue: number;
    title: string;
    excerpt: string;
    category: string;
    date: string;
    ref: string;
}

/**
 * Builds the fully-resolved composition for one cover. `prng` alone
 * decides every RANDOM draw (spot positions, flow-curve shapes), drawn in
 * a FIXED order, so the same `Prng` sequence always reproduces the exact
 * same composition (pinned end to end by `covers.test.ts`'s
 * cross-process determinism check). `fonts` is only consulted for the
 * readable-title layer's real glyph-width measurement (`cover-text-measure.ts`)
 * — it does no I/O itself, since `fonts` is already-read bytes by the time
 * this runs (see `image-generator.ts`).
 */
export function buildCoverComposition(input: CoverCompositionInput, prng: Prng, fonts: CoverFonts): CoverComposition {
    const stats = statsFor(input.title, input.excerpt);
    const palette = buildCoverPalette(input.categoryHue, prng, SPOT_COUNT);

    const spots: CoverSpot[] = palette.spots.map((color) => ({
        cx: randomInRange(prng, 0.05, 0.95) * COVER_WIDTH,
        cy: randomInRange(prng, 0.05, 0.95) * COVER_HEIGHT,
        r: SPOT_RADIUS_FRACTION * COVER_WIDTH,
        color,
    }));

    const flowCurves = buildFlowCurves(prng, stats, COVER_WIDTH, COVER_HEIGHT);
    const waveRidges = buildWaveRidges(`${ input.title } ${ input.excerpt }`, COVER_WIDTH, COVER_HEIGHT);
    const letterformClip = buildLetterformClip(firstWordOf(input.title), COVER_WIDTH, COVER_HEIGHT, "letterform-clip");

    const titleMeasurer = createTextMeasurer(fonts.interExtraBold, TITLE_TEXT_FONT_SIZE);
    const titleTextLayout = buildTitleTextLayout(titleMeasurer, input.title, COVER_WIDTH, COVER_HEIGHT, BASE_LIGHTNESS);

    return {
        base: palette.base,
        spots,
        flowCurves,
        waveRidges,
        letterformClip,
        titleTextLayout,
        stampText: buildStampText(input.category, input.ref, input.date),
    };
}

// ---------------------------------------------------------------------------
// SVG rendering.
//
// No `feGaussianBlur`/`feTurbulence` anywhere below (same reasoning as v1 —
// librsvg's filter-primitive fidelity was never going to be trusted without
// a live check, and every soft edge here is achievable with plain gradient
// stops instead). `mix-blend-mode` IS used (`MESH_BLEND_MODE`) — confirmed
// live to be honoured, unlike the filter primitives, which were never
// re-tested and are still avoided out of the same caution.
// ---------------------------------------------------------------------------

/**
 * Four gradient stops, not two — a wide, soft falloff is what reads as
 * "blurred" using only gradient stops. The middle two stops' positions
 * come from `SPOT_SOFTNESS` (confirmed in the browser playground: higher
 * softness pushes the 55%-opacity stop further out, capped at 85% so it
 * never reaches the fully-transparent edge stop).
 */
function renderSpotGradient(spot: CoverSpot, index: number): string {
    const id = `spot-${ index }`;
    const color = escapeXmlAttribute(spot.color);
    const midStopPercent = 30 + SPOT_SOFTNESS * 25;
    // `Math.min` vs `Math.max` here is unobservable at the CURRENT fixed
    // `SPOT_SOFTNESS = 1` (midStopPercent + 30 always equals exactly 85,
    // verified by hand), but this is a defensive clamp for a FUTURE
    // `SPOT_SOFTNESS` change, not dead code to delete — unlike the
    // opacity checks elsewhere in this slice that guarded a branch with no
    // real future use.
    // Stryker disable next-line MethodExpression
    const outerStopPercent = Math.min(85, midStopPercent + 30);
    return `<radialGradient id="${ id }" cx="50%" cy="50%" r="50%">` +
        `<stop offset="0%" stop-color="${ color }" stop-opacity="${ SPOT_OPACITY }"/>` +
        `<stop offset="${ midStopPercent.toFixed(0) }%" stop-color="${ color }" stop-opacity="${ (SPOT_OPACITY * 0.55).toFixed(2) }"/>` +
        `<stop offset="${ outerStopPercent.toFixed(0) }%" stop-color="${ color }" stop-opacity="${ (SPOT_OPACITY * 0.18).toFixed(2) }"/>` +
        `<stop offset="100%" stop-color="${ color }" stop-opacity="0"/>` +
        "</radialGradient>";
}

function renderSpotCircle(spot: CoverSpot, index: number): string {
    return `<circle cx="${ spot.cx.toFixed(2) }" cy="${ spot.cy.toFixed(2) }" r="${ spot.r.toFixed(2) }" fill="url(#spot-${ index })"/>`;
}

/** The blended mesh group — reused VERBATIM both as the cover's main background layer and (a second time, same markup, referencing the same `<defs>` gradients by id) as the letterform-fill layer's clipped content, so the two visually match exactly. */
function renderMeshSpots(spots: CoverSpot[]): string {
    const circles = spots.map(renderSpotCircle).join("");
    return `<g style="mix-blend-mode:${ MESH_BLEND_MODE }">${ circles }</g>`;
}

/**
 * Renders `composition` to a complete, standalone SVG document —
 * `ProceduralImageGenerator`'s entire output (see `image-generator.ts`).
 * `fonts` is needed here (not just at `buildCoverComposition` time)
 * because the embedded-font `<style>` block references the actual bytes,
 * not just their measurements. Pure and total: every composition,
 * including a degenerate empty one, produces a valid SVG string, never
 * throws.
 */
export function renderCoverSvg(composition: CoverComposition, fonts: CoverFonts): string {
    const spotGradients = composition.spots.map(renderSpotGradient).join("");
    const meshMarkup = renderMeshSpots(composition.spots);

    const letterformFill = `<rect width="${ COVER_WIDTH }" height="${ COVER_HEIGHT }" fill="${ escapeXmlAttribute(composition.base) }"/>${ meshMarkup }`;

    return (
        `<svg width="${ COVER_WIDTH }" height="${ COVER_HEIGHT }" viewBox="0 0 ${ COVER_WIDTH } ${ COVER_HEIGHT }" ` +
        `xmlns="http://www.w3.org/2000/svg">` +
        "<defs>" +
        renderFontFaceStyle(fonts) +
        spotGradients +
        renderLetterformClipDef(composition.letterformClip) +
        `<radialGradient id="vignette" cx="50%" cy="50%" r="75%">` +
        `<stop offset="55%" stop-color="#000000" stop-opacity="0"/>` +
        `<stop offset="100%" stop-color="#000000" stop-opacity="${ VIGNETTE_OPACITY }"/>` +
        "</radialGradient>" +
        "</defs>" +
        `<rect width="${ COVER_WIDTH }" height="${ COVER_HEIGHT }" fill="${ escapeXmlAttribute(composition.base) }"/>` +
        meshMarkup +
        `<g>${ renderFlowCurves(composition.flowCurves) }</g>` +
        `<g>${ renderWaveRidges(composition.waveRidges) }</g>` +
        renderLetterformLayer(composition.letterformClip, letterformFill) +
        renderTitleTextLayer(composition.titleTextLayout) +
        `<rect width="${ COVER_WIDTH }" height="${ COVER_HEIGHT }" fill="url(#vignette)"/>` +
        renderStampText(composition.stampText, COVER_HEIGHT) +
        "</svg>"
    );
}
