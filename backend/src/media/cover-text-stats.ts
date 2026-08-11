/**
 * Turns a post's title+excerpt into a handful of numeric/text signals the
 * organic layers (`cover-flow.ts`, `cover-wave.ts`, `cover-letterform.ts`,
 * `cover-title-text.ts`) shape themselves around — the actual "the title
 * expresses itself in the pattern" requirement from the approved playground
 * design, not just a seed for otherwise-arbitrary geometry. Both title AND
 * excerpt feed in: a short, punchy title alone rarely has enough words to
 * drive a whole composition's rhythm (see the `Generative Cover System v3`
 * plan's own reasoning for why excerpt joined title here).
 */

export interface CoverTextStats {
    /** Total word count across title + excerpt — drives `cover-flow.ts`'s curve count. */
    wordCount: number;
    /** Average word length in characters — drives `cover-flow.ts`'s amplitude. */
    avgWordLen: number;
    /** Fraction of letters that are vowels (Latin + Cyrillic) — a cheap "texture" signal feeding `cover-flow.ts`'s wave frequency. */
    vowelRatio: number;
}

const VOWELS = new Set([..."aeiouаеёиоуыэюя"]);

/**
 * Lowercases, strips everything but letters/digits/whitespace, splits on
 * whitespace — same normalization for both title and excerpt so the two
 * combine into one consistent word list. No `.trim()` before `.split()` —
 * verified by hand (not just reasoned about) that it's redundant: leading/
 * trailing whitespace produces a leading/trailing EMPTY string from
 * `.split(/\s+/)` either way, which `.filter(Boolean)` already removes.
 */
function wordsOf(text: string): string[] {
    const normalized = text.toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, " ");
    // A `+` -> no-quantifier mutant here is equivalent, verified by hand: a
    // run of multiple whitespace characters splits into extra empty
    // strings either way, which the `.filter(Boolean)` below removes
    // regardless of the quantifier. (Split into its own statement, not
    // chained — a disable comment placed inside a chained call silently
    // failed to take effect here, a documented gotcha in this repo.)
    // Stryker disable next-line Regex
    const words = normalized.split(/\s+/);
    return words.filter(Boolean);
}

/**
 * Falls back to a fixed, reasonable vowel ratio (0.4, roughly the natural
 * rate for both English and Russian prose) when there are no letters at
 * all to measure — an empty title+excerpt is a real, if unlikely, input
 * (see `cover-composition.ts`'s own degenerate-input handling), and this
 * keeps every downstream layer's math well-defined rather than NaN.
 */
const EMPTY_TEXT_VOWEL_RATIO = 0.4;

export function statsFor(title: string, excerpt: string): CoverTextStats {
    const words = [...wordsOf(title), ...wordsOf(excerpt)];
    const letters = words.join("").split("");
    const vowelCount = letters.filter((letter) => VOWELS.has(letter)).length;

    return {
        wordCount: words.length,
        avgWordLen: letters.length / Math.max(1, words.length),
        vowelRatio: letters.length > 0 ? vowelCount / letters.length : EMPTY_TEXT_VOWEL_RATIO,
    };
}

/** The word `cover-letterform.ts` clips its fill to — first word of the title, uppercased. Falls back to a single neutral letter for a title with no words at all (blank title mid-edit, say), so the layer never has to special-case "no text". */
const FALLBACK_LETTERFORM_WORD = "X";

export function firstWordOf(title: string): string {
    const [first] = wordsOf(title);
    return (first ?? FALLBACK_LETTERFORM_WORD).toUpperCase();
}
