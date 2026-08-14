import { escapeXmlText } from "./cover-xml";

/**
 * Letterform-fill layer: the first word of the post's title becomes a
 * `<clipPath>` mask, and the caller-supplied fill markup (a brighter copy
 * of the mesh, in `cover-composition.ts`) only shows up INSIDE the letters
 * — the pattern literally lives inside the title's own word, rather than
 * being an unrelated shape next to it. Confirmed live (Day-0 gate): a
 * `<text>` element works as a `<clipPath>`'s content in librsvg, using the
 * exact same embedded-font technique the readable-title/stamp layers use.
 *
 * Deliberately agnostic about what "fill markup" IS — this module only
 * builds the clip mask and the outline, and wraps whatever SVG string
 * `cover-composition.ts` hands it. That keeps this file free of any
 * dependency on `cover-flow.ts`/`cover-palette.ts`, avoiding an import
 * cycle (`cover-composition.ts` already depends on both of those).
 */

export const LETTERFORM_OPACITY = 0.9;
/** Font size as a fraction of canvas height — large enough that the letter dominates its region without a "watermark" needing to bleed off the canvas edge (see the plan's own note that this layer replaced the earlier giant-single-letter watermark idea). */
export const LETTERFORM_FONT_SCALE = 0.86;
export const LETTERFORM_OUTLINE_OPACITY = 0.06;
export const LETTERFORM_FONT_FAMILY = "Inter";
/** Black — the heaviest static instance fetched by `scripts/fetch-cover-fonts.mjs` — so the letter reads as a solid block of colour, not a thin outline of a word. */
export const LETTERFORM_FONT_WEIGHT = 900;

export interface LetterformClip {
    clipId: string;
    word: string;
    fontSize: number;
    x: number;
    y: number;
}

/** Builds the (pure) geometry for one letterform clip — a fixed centered position, sized off `height` alone so it's independent of `word`'s actual length (a long word simply overflows the canvas at its edges, matching the "giant, cropped" look confirmed in the playground). */
export function buildLetterformClip(word: string, width: number, height: number, clipId: string): LetterformClip {
    return {
        clipId,
        word,
        fontSize: height * LETTERFORM_FONT_SCALE,
        x: width / 2,
        y: height * 0.58,
    };
}

function textElement(clip: LetterformClip, extraAttributes: string): string {
    return `<text x="${ clip.x.toFixed(1) }" y="${ clip.y.toFixed(1) }" font-family="${ LETTERFORM_FONT_FAMILY }" font-weight="${ LETTERFORM_FONT_WEIGHT }" font-size="${ clip.fontSize.toFixed(0) }" text-anchor="middle"${ extraAttributes }>${ escapeXmlText(clip.word) }</text>`;
}

/** The `<clipPath>` definition itself — belongs in the SVG's `<defs>` block. */
export function renderLetterformClipDef(clip: LetterformClip): string {
    return `<clipPath id="${ clip.clipId }">${ textElement(clip, "") }</clipPath>`;
}

/**
 * Wraps `fillMarkup` in a group clipped to `clip`'s letterform, plus a
 * faint full-strength outline of the same word drawn UNCLIPPED behind/
 * around it — the outline is what makes the letter's shape legible even in
 * the parts where the clipped fill happens to be dark or low-contrast.
 */
export function renderLetterformLayer(clip: LetterformClip, fillMarkup: string): string {
    // No `LETTERFORM_OUTLINE_OPACITY > 0` guard — it's a fixed positive
    // module constant (see its own comment), not a runtime toggle, so the
    // branch that would skip the outline is unreachable dead code, not a
    // real feature.
    const outline = textElement(clip, ` fill="none" stroke="#ffffff" stroke-width="1.5" opacity="${ LETTERFORM_OUTLINE_OPACITY }"`);
    return `<g clip-path="url(#${ clip.clipId })" opacity="${ LETTERFORM_OPACITY }">${ fillMarkup }</g>${ outline }`;
}
