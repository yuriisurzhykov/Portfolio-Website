import { escapeXmlText } from "./cover-xml";
import { wrapText, type TextMeasurer } from "./cover-text-measure";

/**
 * Readable-title layer — the direct fix for the "I want more context for
 * the reader" feedback in the `Generative Cover System v3` plan: every
 * other layer treats the title as raw material for an abstract pattern
 * (waveform, letterform-fill), but this is the only place it's actually
 * legible. Real wrapped text (via `cover-text-measure.ts`'s font-accurate
 * measurement, not an approximation), a scrim for guaranteed contrast
 * against whatever the mesh/flow/wave layers happen to render underneath,
 * and colour that auto-contrasts against the category's base lightness.
 */

export const TITLE_TEXT_OPACITY = 0.96;
export const TITLE_TEXT_FONT_SIZE = 46;
export const TITLE_TEXT_MAX_WIDTH_FRACTION = 0.58;
export const TITLE_TEXT_MAX_LINES = 3;
export const TITLE_TEXT_SCRIM_OPACITY = 0.36;
export const TITLE_TEXT_MARGIN = 56;
export const TITLE_TEXT_FONT_FAMILY = "Inter";
export const TITLE_TEXT_FONT_WEIGHT = 800;

const LINE_HEIGHT_MULTIPLIER = 1.2;
/** Nudges the first line's baseline down from a pure vertical-center so the text's optical center (not its em-box top) lines up with the layout's vertical middle. */
const BASELINE_NUDGE = 0.85;
const SCRIM_PADDING = 26;
const SCRIM_TOP_NUDGE = 0.9;
const SCRIM_HEIGHT_PADDING_MULTIPLIER = 1.2;
/** Lightness above which the base colour reads as "light enough" that dark text (and a light scrim) is the higher-contrast choice — the same 0.55 threshold confirmed in the browser playground. */
const LIGHT_BACKGROUND_THRESHOLD = 0.55;

export interface TitleTextLine {
    text: string;
    y: number;
}

export interface TitleTextScrim {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
}

export interface TitleTextLayout {
    lines: TitleTextLine[];
    x: number;
    color: string;
    /** Always present — `TITLE_TEXT_SCRIM_OPACITY` is a fixed positive module constant, not a runtime toggle, so there is no real "no scrim" case to model as `null`. */
    scrim: TitleTextScrim;
}

/**
 * Computes the full layout (wrapped lines, position, colour, scrim box) —
 * pure given a `measurer` bound to the real embedded title font, so every
 * number here is independently assertable without rendering any SVG.
 * Returns `null` for a blank title (mid-autosave, say) rather than an
 * empty-but-still-rendered layer.
 */
export function buildTitleTextLayout(measurer: TextMeasurer, title: string, width: number, height: number, baseLightness: number): TitleTextLayout | null {
    const maxWidth = width * TITLE_TEXT_MAX_WIDTH_FRACTION;
    const lines = wrapText(measurer, title, maxWidth, TITLE_TEXT_MAX_LINES);
    if (lines.length === 0) {
        return null;
    }

    const lineHeight = TITLE_TEXT_FONT_SIZE * LINE_HEIGHT_MULTIPLIER;
    const totalHeight = lines.length * lineHeight;
    const x = TITLE_TEXT_MARGIN;
    const firstBaselineY = height / 2 - totalHeight / 2 + TITLE_TEXT_FONT_SIZE * BASELINE_NUDGE;
    const isLightBackground = baseLightness > LIGHT_BACKGROUND_THRESHOLD;
    const color = isLightBackground ? "#0b0b0d" : "#ffffff";

    const positionedLines = lines.map((text, index) => ({ text, y: firstBaselineY + index * lineHeight }));

    const widest = Math.max(...lines.map((line) => measurer.widthOf(line)));
    const scrim: TitleTextScrim = {
        x: x - SCRIM_PADDING,
        y: firstBaselineY - TITLE_TEXT_FONT_SIZE * SCRIM_TOP_NUDGE - SCRIM_PADDING * 0.6,
        width: widest + SCRIM_PADDING * 2,
        height: totalHeight + SCRIM_PADDING * SCRIM_HEIGHT_PADDING_MULTIPLIER,
        color: isLightBackground ? "#ffffff" : "#050506",
    };

    return { lines: positionedLines, x, color, scrim };
}

/** Renders `buildTitleTextLayout`'s output as SVG markup — a scrim `<rect>` (if any) followed by one `<text>` per line. Returns an empty string for `null` (no title, no layer). */
export function renderTitleTextLayer(layout: TitleTextLayout | null): string {
    if (!layout) {
        return "";
    }

    // No presence check on `layout.scrim` — it's always populated (see
    // `TitleTextLayout`'s own comment), never a real "skip the scrim" case.
    const scrimMarkup = `<rect x="${ layout.scrim.x.toFixed(1) }" y="${ layout.scrim.y.toFixed(1) }" width="${ layout.scrim.width.toFixed(1) }" height="${ layout.scrim.height.toFixed(1) }" rx="12" fill="${ layout.scrim.color }" opacity="${ TITLE_TEXT_SCRIM_OPACITY }"/>`;

    const textMarkup = layout.lines
        .map((line) => `<text x="${ layout.x.toFixed(1) }" y="${ line.y.toFixed(1) }" font-family="${ TITLE_TEXT_FONT_FAMILY }" font-weight="${ TITLE_TEXT_FONT_WEIGHT }" font-size="${ TITLE_TEXT_FONT_SIZE }" fill="${ layout.color }" text-anchor="start" opacity="${ TITLE_TEXT_OPACITY }">${ escapeXmlText(line.text) }</text>`)
        .join("");

    return scrimMarkup + textMarkup;
}
