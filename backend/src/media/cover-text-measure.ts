// Namespace import, not default — `fontkit` is CJS with no real default
// export; `import fontkit from "fontkit"` resolves to `undefined` under
// Node's own ESM loader (confirmed live: throws "does not provide an
// export named 'default'"). The `@types/fontkit` declarations don't flag
// this because TypeScript's `esModuleInterop` synthesizes a default at the
// TYPE level regardless of what actually exists at runtime.
import * as fontkit from "fontkit";
import type { Font } from "fontkit";

/**
 * Server-side replacement for the browser playground's
 * `canvas.measureText()` — there is no DOM/Canvas in the Node process that
 * actually renders a cover (see the `Generative Cover System v3` plan's
 * "Новое: серверное измерение текста без DOM" section for why a plain
 * average-character-width heuristic was rejected in favour of this).
 *
 * `fontkit` reads the REAL glyph advance widths out of the exact same TTF
 * buffer that gets base64-embedded into the SVG's `@font-face` — one source
 * of truth for "how wide is this text," not a second, potentially-wrong
 * guess about the font's metrics. Confirmed live (Day-0 gate): the same
 * embedded-font technique already renders correctly through `sharp`/
 * librsvg, so measuring against that exact font file is measuring what
 * will actually be drawn, not an approximation of it.
 */

export interface TextMeasurer {
    /** Width, in pixels, that `text` would occupy at this measurer's font size — ligature/kerning-aware (via fontkit's `layout`, not a naive sum of individual glyph widths). */
    widthOf(text: string): number;
}

/** Builds a measurer bound to one already-loaded font file's bytes, at one fixed font size — a fresh `Font` per call is fine here: this only ever runs once per cover generation (a post publish), never per page view. */
export function createTextMeasurer(fontBytes: Buffer, fontSizePx: number): TextMeasurer {
    const font = fontkit.create(fontBytes) as Font;

    return {
        widthOf(text: string): number {
            // No `text.length === 0` early return — verified by hand: `font.layout("")` itself
            // already returns zero glyphs/positions, so `reduce`'s initial value (0) carries
            // straight through without the guard.
            const run = font.layout(text);
            const totalAdvanceUnits = run.positions.reduce((sum, position) => sum + position.xAdvance, 0);
            return (totalAdvanceUnits / font.unitsPerEm) * fontSizePx;
        },
    };
}

const ELLIPSIS = "…";

/**
 * Shrinks `line` one character at a time until `line + "…"` fits within
 * `maxWidthPx` — the same approach `cover-title-text.ts`'s browser
 * prototype used, ported from `canvas.measureText` to `measurer.widthOf`.
 */
/** Exported for its own direct, precise unit tests (see cover-text-measure.test.ts) — engineering a specific truncation-length/trailing-whitespace scenario through the public `wrapText` API alone would require juggling the SAME `maxWidthPx` for both word-wrapping and truncation, which makes some scenarios (e.g. a truncation that lands exactly on a trailing space) awkward to construct indirectly. */
export function truncateWithEllipsis(measurer: TextMeasurer, line: string, maxWidthPx: number): string {
    let truncated = line;
    while (truncated.length > 1 && measurer.widthOf(truncated + ELLIPSIS) > maxWidthPx) {
        truncated = truncated.slice(0, -1);
    }
    return truncated.replace(/\s+$/, "") + ELLIPSIS;
}

/**
 * Greedy word-wrap: packs words onto a line until the next word would
 * overflow `maxWidthPx`, starting a new line instead — up to `maxLines`.
 * Any remaining, unconsumed words are collapsed into an ellipsis on the
 * LAST line rather than silently dropped or left overflowing the canvas.
 *
 * Pure given `measurer`: same `text`/`maxWidthPx`/`maxLines` always
 * produces the same lines, since `measurer.widthOf` is itself a pure
 * function of the (fixed, committed) embedded font file.
 */
export function wrapText(measurer: TextMeasurer, text: string, maxWidthPx: number, maxLines: number): string[] {
    // No `words.length === 0` early return here — verified by hand (not
    // just reasoned about) that it would be dead code: an empty `words`
    // array already makes the `for` loop below execute zero times, leaves
    // `current` at its initial `""`, and `if (current)` below correctly
    // skips pushing it — `lines.slice(0, maxLines)` on the still-empty
    // `lines` array returns `[]` either way.
    //
    // `.trim()`, `/\s+/`'s `+` quantifier, and `.filter(Boolean)` each
    // individually mutated here are equivalent, verified by hand: with the
    // OTHER two intact, no realistic input (leading/trailing whitespace, a
    // run of internal whitespace) produces an empty-string element that
    // survives to reach the loop below, so none of the three ever changes
    // observable output on its own.
    // Stryker disable next-line MethodExpression,Regex
    const words = text.trim().split(/\s+/).filter(Boolean);

    const lines: string[] = [];
    let current = "";

    for (const word of words) {
        const attempt = current ? `${ current } ${ word }` : word;
        if (current && measurer.widthOf(attempt) > maxWidthPx) {
            lines.push(current);
            current = word;
            if (lines.length === maxLines) {
                lines[lines.length - 1] = truncateWithEllipsis(measurer, lines[lines.length - 1], maxWidthPx);
                return lines;
            }
        } else {
            current = attempt;
        }
    }

    if (current) {
        lines.push(current);
    }
    return lines.slice(0, maxLines);
}
