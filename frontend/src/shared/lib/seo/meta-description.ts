/**
 * The default clamp length. Google typically truncates a snippet around
 * 155-160 characters; 155 leaves a little room before the cut lands mid-word
 * in the worst case (this function backs off to the nearest word boundary
 * anyway, so the real worst case is a few characters shorter still).
 */
const DEFAULT_MAX_LENGTH = 155;

/**
 * Clamps a description for `description`/`og:description`/`twitter:description`
 * ONLY — never the visible copy a page actually renders. The homepage hero's
 * subhead, for instance, is shown on the page in full; a helper that shortened
 * the source string itself would silently truncate what a real visitor reads,
 * for a search-snippet concern that has nothing to do with page content. Every
 * caller must pass the same string it renders and clamp only the copy handed
 * to `generateMetadata`.
 *
 * Breaks on the last word boundary at or before `maxLength`, so the result
 * never ends mid-word, then appends an ellipsis to signal the cut. A string
 * with no space before the limit (a single very long word) falls back to a
 * hard cut rather than returning the original untruncated — the length
 * invariant holds either way.
 */
export function clampMetaDescription(value: string, maxLength: number = DEFAULT_MAX_LENGTH): string {
    if (value.length <= maxLength) {
        return value;
    }
    const truncated = value.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    const base = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
    return `${ base.trimEnd() }…`;
}
