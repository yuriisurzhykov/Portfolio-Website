import { escapeXmlText } from "./cover-xml";

/**
 * Technical-artifact stamp: a small monospace line in the corner —
 * `CATEGORY / REF <hash> / DATE` — the one layer that's purely decorative
 * metadata rather than derived from the title/excerpt's content. `ref` is
 * computed by the caller (`covers.ts`, reusing `content-hash.ts`'s
 * `sha256Hex` — this module has no hashing knowledge of its own), and
 * `date` comes straight from `Post.date` (already a display-formatted
 * string, see schema.prisma).
 */

export const STAMP_OPACITY = 0.6;
export const STAMP_FONT_SIZE = 16;
export const STAMP_LETTER_SPACING = 2;
export const STAMP_MARGIN = 28;
export const STAMP_FONT_FAMILY = "JetBrains Mono";
export const STAMP_FONT_WEIGHT = 500;
export const STAMP_COLOR = "#f5f3f0";
/** What an empty/uncategorized post's stamp reads instead of a blank segment — matches `covers.ts`'s own "(uncategorized)" handling in spirit, without importing from it (this module has zero dependencies on the DB-backed layer). */
const FALLBACK_CATEGORY_LABEL = "JOURNAL";

export function buildStampText(categoryLabel: string, ref: string, date: string): string {
    const category = categoryLabel.trim() || FALLBACK_CATEGORY_LABEL;
    return `${ category.toUpperCase() } / ${ ref } / ${ date }`;
}

/** Renders an ALREADY-BUILT stamp string as a single `<text>` element, bottom-left — kept separate from `buildStampText` so `cover-composition.ts` can resolve the text once (in `buildCoverComposition`) and reuse it at render time without recomputing. */
export function renderStampText(text: string, height: number): string {
    const x = STAMP_MARGIN;
    const y = height - STAMP_MARGIN;
    return `<text x="${ x }" y="${ y }" font-family="${ STAMP_FONT_FAMILY }" font-weight="${ STAMP_FONT_WEIGHT }" font-size="${ STAMP_FONT_SIZE }" letter-spacing="${ STAMP_LETTER_SPACING }" fill="${ STAMP_COLOR }" opacity="${ STAMP_OPACITY }" text-anchor="start">${ escapeXmlText(text) }</text>`;
}

/** Convenience wrapper for standalone use (and this module's own tests): builds and renders in one call. */
export function renderStampLayer(categoryLabel: string, ref: string, date: string, height: number): string {
    return renderStampText(buildStampText(categoryLabel, ref, date), height);
}
