import type { BlockInput } from "./blocks";

/**
 * A commonly-cited average adult silent-reading speed for prose in
 * English — the same ballpark most "N min read" estimators on
 * blogging/CMS platforms use. This is deliberately a rough estimate, not
 * a precision metric: `readMins` was always meant to give a reader a feel
 * for length before committing to a post, not a lab-measured number.
 */
const WORDS_PER_MINUTE = 200;

/**
 * Pulls the actual PROSE out of one block — the same "what counts as
 * readable text" judgment call `<ContentBlocks>` (web) makes when
 * deciding what to render, just for word-counting instead of rendering.
 * `code` is deliberately excluded entirely: a code sample isn't read at
 * prose speed (skimmed, or not read line-by-line at all), and including
 * its line count would make a post with one long code block look like a
 * much longer read than it actually is.
 */
function extractProse(block: BlockInput): string {
    switch (block.type) {
        case "lead":
        case "paragraph":
        case "heading":
        case "quote":
        case "note":
            return block.text;
        case "image":
            return block.text ?? "";
        case "approachList":
            return block.data.items.map((item) => `${ item.title } ${ item.description }`).join(" ");
        case "code":
            return "";
    }
}

function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * `readMins` is derived, never admin-entered — see `admin-posts.ts`'s
 * `createPost`/`updatePost`, the only two callers. Recomputed on every
 * save (not just at creation), so it always reflects the post's ACTUAL
 * current length, the same way `date` is set once but `readMins` tracks
 * the body as it grows/shrinks across edits.
 *
 * Word count is taken as-is from each block's Markdown text — `**bold**`/
 * `[text](url)` syntax inflates the count slightly (asterisks/URLs get
 * counted as "words"), which is an acceptable trade-off for a rough
 * estimate; stripping Markdown syntax precisely would need a real parser
 * for a number nobody reads to two significant figures anyway.
 *
 * Returns `0` (not `1`) for a body with zero words — matches the existing
 * "upcoming stub with no body written yet" convention (`readMins: 0`
 * historically meant "nothing to read"), not "less than a minute."
 */
export function estimateReadMins(blocks: BlockInput[]): number {
    const totalWords = blocks.reduce((sum, block) => sum + countWords(extractProse(block)), 0);
    if (totalWords === 0) {
        return 0;
    }
    return Math.max(1, Math.round(totalWords / WORDS_PER_MINUTE));
}
