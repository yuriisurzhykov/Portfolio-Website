import type { BlockInput, ListItemInput } from "./blocks";

/**
 * Flattens a list item's own text plus everything nested under it
 * (`item.blocks` — a continued sub-list, or any other attached block, in
 * their real order — see `blocks.ts`'s comment on `ListItemInput`) into one
 * string, depth-first. Recurses through `extractProse` itself, not a
 * parallel "prose of a block" implementation — a sub-list's items and an
 * attached image's caption count the exact same way they would at the top
 * level, since they're the exact same `BlockInput` shapes.
 */
function extractListItemProse(items: ListItemInput[]): string {
    return items
        .map((item) => [item.text, ...item.blocks.map(extractProse)].filter(Boolean).join(" "))
        .join(" ");
}

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
// Exported (not just internal), specifically so mutation testing/unit tests
// can pin each case's exact behavior directly — see reading-time.test.ts.
// Testing only through `estimateReadMins`'s rounded-to-the-nearest-minute
// output hid several real gaps (mutation testing found them): e.g. an
// off-by-one word from a missing join separator almost never moves the
// rounded minute count, so a test asserting only the final minutes number
// can't tell a correct implementation from several subtly wrong ones.
export function extractProse(block: BlockInput): string {
    switch (block.type) {
        case "lead":
        case "paragraph":
        case "heading":
        case "quote":
        // Stryker disable next-line ConditionalExpression: equivalent, not
        // untested — "note".text is a required (non-nullish) string per
        // blocks.ts's Zod schema, so if a mutant deletes this case's own
        // `return`, execution falls through into "image"'s `return
        // block.text ?? ""` instead, which produces the exact same result
        // for any string "note".text can actually hold (`??` only ever
        // changes behavior for `null`/`undefined`, which this field's
        // schema rules out).
        case "note":
            return block.text;
        case "image":
            return block.text ?? "";
        case "approachList":
            return block.data.items.map((item) => `${ item.title } ${ item.description }`).join(" ");
        case "code":
            return "";
        case "diagram":
            return block.text ?? "";
        case "list":
            return extractListItemProse(block.data.items);
    }
}

export function countWords(text: string): number {
    // Both `.trim()` and `\s+` (vs `\s`) are provably redundant given the
    // trailing `.filter(Boolean)`, so their mutants are genuinely
    // equivalent, not untested — verified by hand, not assumed, before
    // disabling: "  a   b  ".split(/\s/) (no trim, single-char class)
    // produces several empty strings around every individual whitespace
    // character (e.g. between the 3 spaces in "a   b"), and untrimmed
    // leading/trailing runs produce leading/trailing empty strings too —
    // `.filter(Boolean)` discards every one of them, landing on the exact
    // same ["a", "b"] either way.
    // Stryker disable next-line Regex,MethodExpression
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
