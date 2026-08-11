/**
 * Category-hue math: how a `CategoryHue.ordinal` (see `covers.ts`'s
 * `resolveCategoryHue`) becomes a concrete hue in degrees, and how an OKLCH
 * colour becomes an sRGB hex string every downstream consumer (SVG markup,
 * satori for the OG accent) can actually render. See
 * `backend/src/media/README.md`'s "Назначение тона категории" entry for the
 * full reasoning behind why this is van der Corput, not a fixed palette or
 * the golden angle.
 */

/**
 * van der Corput sequence, base 2 — reads `ordinal`'s bits reversed, as a
 * binary fraction: 0, 1/2, 1/4, 3/4, 1/8, 5/8, 3/8, 7/8, 1/16, ... "Cut the
 * circle in half, then cut each half in half again" is the plain-language
 * description; this is its closed-form bit-reversal implementation.
 */
function vanDerCorput(ordinal: number): number {
    let bits = ordinal >>> 0;
    let result = 0;
    let denominator = 1;
    while (bits > 0) {
        denominator *= 2;
        result += (bits & 1) / denominator;
        bits >>>= 1;
    }
    return result;
}

/**
 * The hue (0-360°, exclusive of 360) assigned to the Nth category ever seen
 * — a pure function of `ordinal` alone, never re-derived from `count()` (see
 * `covers.ts`): ordinal 0 → 0°, 1 → 180°, 2 → 90°, 3 → 270°, 4 → 45°, ...
 * Guarantees a minimum gap between any two assigned hues never worse than
 * half the theoretical ceiling `360/n`, and exactly the ceiling when the
 * category count is a power of two — see this repo's README for the
 * per-n numbers that ruled out the golden angle instead.
 */
export function hueForOrdinal(ordinal: number): number {
    return vanDerCorput(ordinal) * 360;
}

// ---------------------------------------------------------------------------
// OKLCH -> sRGB, with gamut clipping.
//
// Conversion matrices are Björn Ottosson's published OKLab constants
// (https://bottosson.github.io/posts/oklab/, public domain) — not derived
// here, just implemented.
// ---------------------------------------------------------------------------

type LinearRgb = [number, number, number];

function oklchToLinearSrgb(lightness: number, chroma: number, hueDeg: number): LinearRgb {
    const hueRad = (hueDeg * Math.PI) / 180;
    const a = chroma * Math.cos(hueRad);
    const b = chroma * Math.sin(hueRad);

    const l_ = lightness + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = lightness - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = lightness - 0.0894841775 * a - 1.291485548 * b;

    const l = l_ ** 3;
    const m = m_ ** 3;
    const s = s_ ** 3;

    return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
}

function linearToGammaChannel(value: number): number {
    if (value <= 0.0031308) {
        return 12.92 * value;
    }
    return 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
}

/** A tiny epsilon on both ends — floating-point round-trip through the matrices above can land a hair outside [0, 1] for a colour that is, for every practical purpose, exactly in gamut. */
const GAMUT_EPSILON = 1e-4;

function isInGamut(linear: LinearRgb): boolean {
    return linear.every((channel) => channel >= -GAMUT_EPSILON && channel <= 1 + GAMUT_EPSILON);
}

const GAMUT_CLIP_ITERATIONS = 24;

/**
 * Binary-searches chroma DOWN (holding lightness/hue fixed) until every
 * linear-sRGB channel falls inside `[0, 1]`. High chroma at some hues
 * (saturated blues and greens especially) falls outside sRGB entirely —
 * without this, those channels would simply get hard-clamped to 0/255 at
 * the final rounding step, which SHIFTS the apparent hue rather than just
 * dimming the colour (see `oklchToSrgbHex`'s own test asserting every
 * output stays in-gamut, across a hue sweep, for the boundary this catches).
 */
function clipChromaToGamut(lightness: number, chroma: number, hueDeg: number): number {
    if (isInGamut(oklchToLinearSrgb(lightness, chroma, hueDeg))) {
        return chroma;
    }
    let low = 0;
    let high = chroma;
    for (let i = 0; i < GAMUT_CLIP_ITERATIONS; i++) {
        const mid = (low + high) / 2;
        if (isInGamut(oklchToLinearSrgb(lightness, mid, hueDeg))) {
            low = mid;
        } else {
            high = mid;
        }
    }
    return low;
}

function toHexByte(channel: number): string {
    const clamped = Math.min(1, Math.max(0, channel));
    return Math.round(clamped * 255)
        .toString(16)
        .padStart(2, "0");
}

/**
 * OKLCH (perceptually-uniform lightness/chroma, hue in degrees) to an sRGB
 * hex string — the one place this feature crosses from "author in a
 * perceptually uniform space" to "a concrete pixel value a browser, satori,
 * or librsvg all understand identically" (none of the three parse
 * `oklch()` reliably — satori silently paints near-black, see
 * `seo/og/render.tsx`'s own comment; the SVG cover source must ship
 * pre-converted hex for the exact same reason).
 *
 * Chroma is clipped to the sRGB gamut BEFORE conversion (see
 * `clipChromaToGamut`), not clamped after — clamping the final channels
 * would dim an out-of-gamut colour without correcting the hue shift that
 * comes with it.
 */
export function oklchToSrgbHex(lightness: number, chroma: number, hueDeg: number): string {
    const normalizedHue = ((hueDeg % 360) + 360) % 360;
    const safeChroma = clipChromaToGamut(lightness, chroma, normalizedHue);
    const [r, g, b] = oklchToLinearSrgb(lightness, safeChroma, normalizedHue).map(linearToGammaChannel);
    return `#${ toHexByte(r) }${ toHexByte(g) }${ toHexByte(b) }`;
}
