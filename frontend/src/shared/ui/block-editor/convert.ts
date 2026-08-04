import { BlockNoteEditor } from "@blocknote/core";
import type { Block, BlockInput, ListItemInput } from "@portfolio/backend";
import { blockNoteSchema, type PortfolioBlockNoteEditor } from "./schema";
import { parseApproachItems } from "./blocks/ApproachListBlock";

type PortfolioEditor = PortfolioBlockNoteEditor;
export type PortfolioBlock = typeof blockNoteSchema.Block;
type PortfolioPartialBlock = typeof blockNoteSchema.PartialBlock;
type InlineContent = PortfolioBlock["content"];

/** The two BlockNote-native block types this site's single `"list"` `BlockType` groups into/out of — see the "list" cases below. */
type ListItemBlockType = "bulletListItem" | "numberedListItem";

/** Every `PortfolioBlock` EXCEPT the two list-item types — the type `convertSingleBlock`'s switch is written against, so adding `"list"` grouping above/around it doesn't force that switch to also handle `bulletListItem`/`numberedListItem` (they never reach it — see `editorBlocksToBlockInputs`). */
type NonListPortfolioBlock = Exclude<PortfolioBlock, { type: "bulletListItem" } | { type: "numberedListItem" }>;

/**
 * Markdown text (`Block.text`, from the database) → BlockNote's rich
 * inline content — `**bold**`/`*italic*`/`[link](url)` become real
 * BlockNote marks, not literal asterisks/brackets on screen. Parses
 * through a throwaway, never-mounted editor instance:
 * `tryParseMarkdownToBlocks` is an editor method, not a standalone
 * utility (BlockNote's Markdown support is wired through the same
 * ProseMirror schema a real editor uses), and `BlockNoteEditor.create()`
 * without a following `.mount(element)` never creates an actual
 * ProseMirror view — there's nothing to dispose once this function
 * returns.
 *
 * Reads `parsed[0].content` (a bare paragraph BlockNote parses the text
 * into), not the whole parsed block — wrapping in a plain paragraph before
 * parsing/serializing is what keeps this to JUST the inline marks, with
 * none of a real "heading"/"quote" block's own block-level Markdown
 * syntax ("## ", "> ") along for the ride. This site's block `type`
 * already encodes heading/quote-ness; re-deriving it from the text would
 * double up.
 *
 * NOTE: Exported for `paste-handler.ts` — the exact same markdown-to-rich-text
 * conversion a stored block's `text` goes through, reused so a pasted quote's
 * `**bold**`/links parse the same way a saved one would.
 */
export function markdownToInlineContent(parsingEditor: PortfolioEditor, text: string): InlineContent {
    // Equivalent for the one falsy `string` value this guard can ever see
    // (`""`, since a real `text: string` can't be `null`/`undefined` — the
    // Zod schema behind it doesn't allow that) — verified, not assumed:
    // `parsingEditor.tryParseMarkdownToBlocks("")` already produces a
    // single paragraph with `content: []`, identical to this early return.
    // Kept as a small, self-documenting skip of the parser call for the
    // common "block has no text yet" case, not because the parser can't
    // handle "" itself.
    // Stryker disable next-line ConditionalExpression,BlockStatement
    if (!text) {
        return [];
    }
    const [parsed] = parsingEditor.tryParseMarkdownToBlocks(text);
    // Stryker disable next-line ArrayDeclaration: defensive, not confirmed
    // reachable — tried a dozen edge-case inputs by hand (whitespace-only,
    // "---", "> ", "```", zero-width space, an HTML comment) and
    // `tryParseMarkdownToBlocks` always returned at least one block with a
    // defined `.content` array for every non-empty string. Kept as a type-
    // safety fallback against `tryParseMarkdownToBlocks`'s own optional
    // typing, not proven unreachable in general.
    return (parsed?.content as InlineContent | undefined) ?? [];
}

/**
 * BlockNote's own markdown exporter (`@blocknote/core`'s
 * `api/exporters/markdown/htmlToMarkdown.ts`) renders a hard break
 * (Shift+Enter) as the two characters `\` + newline, and tries to strip a
 * TRAILING one so a break at the very end of a field (nothing left to break
 * to) doesn't leak into the saved text — but its own regex
 * (`/(\\\n)+$/`) only matches when `\` + newline is the absolute last thing
 * in the string.
 *
 * Verified live, not assumed: feeding `<p>Line1<br> </p>` and
 * `<p>Line1<br>&nbsp;</p>` — the exact shape a browser's contenteditable
 * leaves behind after an emptied trailing line — through
 * `editor.tryParseHTMLToBlocks` + `editor.blocksToMarkdownLossy` both
 * produced the literal string `"Line1\\\n"`, where a plain trailing
 * `<p>Line1<br></p>` (no extra whitespace) correctly produced `"Line1\n"`
 * (no backslash at all). The trailing space/`&nbsp;` defeats BlockNote's
 * end-anchored regex; `inlineContentToMarkdown`'s own trailing `.trim()`
 * below then strips the dangling newline but not the backslash itself,
 * leaving a bare, meaningless `\` as the saved text's last character — not
 * a valid CommonMark hard break with nothing after it, so it renders
 * literally on the public page instead of a line break.
 *
 * Requires a REAL newline immediately after the backslash, not just any
 * trailing `\` — a deliberately-typed escaped backslash at the very end of
 * a field, with no line break following it, is left untouched.
 */
function stripDanglingTrailingHardBreak(markdown: string): string {
    return markdown.replace(/\\\n\s*$/, "");
}

/** The reverse of `markdownToInlineContent` — same "wrap as a bare paragraph first" reasoning, just serializing instead of parsing. */
function inlineContentToMarkdown(editor: PortfolioEditor, content: InlineContent): string {
    const markdown = editor.blocksToMarkdownLossy([{type: "paragraph", content} as PortfolioPartialBlock]);
    return stripDanglingTrailingHardBreak(markdown).trim();
}

/**
 * One `ListItemInput` (DB shape — `text`/`blocks`, no `type`) → one
 * BlockNote list-item `PartialBlock`. `itemType` is threaded through from
 * the parent `"list"` block's `data.ordered` flag — every item in a single
 * DB `"list"` block shares one bullet-vs-numbered choice, matching how
 * `data.ordered` is stored once per block, not once per item.
 *
 * `item.blocks` — EVERYTHING Tab-nested under this item, in their real
 * order, including a continued sub-list as an ordinary nested `"list"`
 * entry (see `blocks.ts`'s comment on `ListItemInput`) — converts via the
 * SAME `blockToPartialBlocks` used for top-level document blocks, straight
 * into BlockNote's own `children` array. A nested `"list"` entry expands
 * through `blockToPartialBlocks`'s own `case "list"` into its own
 * `bulletListItem`/`numberedListItem` siblings, WITH ITS OWN `itemType`
 * derived from its own `data.ordered` — never the parent's — so a numbered
 * sub-list under a bullet parent (or vice versa) round-trips correctly.
 */
function listItemToPartialBlock(
    parsingEditor: PortfolioEditor,
    item: ListItemInput,
    itemType: ListItemBlockType,
): PortfolioPartialBlock {
    return {
        type: itemType,
        content: markdownToInlineContent(parsingEditor, item.text),
        children: item.blocks.flatMap((attached) => blockToPartialBlocks(parsingEditor, attached)),
    } as PortfolioPartialBlock;
}

/**
 * One DB block (`Block`, read from storage with `id`/`order` — OR
 * `BlockInput`, an item's `blocks` entry, without them) → the
 * PartialBlock(s) it becomes in the editor. A plain function, not inlined
 * into `blocksToPartialBlocks`'s `flatMap`, so `listItemToPartialBlock`
 * above can reuse the exact same per-type conversion for a list item's
 * attached `blocks` instead of duplicating this switch. Never reads
 * `id`/`order` — both `Block` and `BlockInput` share the identical
 * `text`/`data` shape per type (`blocks.ts`'s "core" schemas), so this
 * works unchanged for either.
 */
function blockToPartialBlocks(parsingEditor: PortfolioEditor, block: Block | BlockInput): PortfolioPartialBlock[] {
    switch (block.type) {
        case "lead":
        case "paragraph":
            return [{type: block.type, content: markdownToInlineContent(parsingEditor, block.text)}];
        case "heading":
            return [{
                type: "heading",
                props: {level: block.data?.level ?? 2},
                content: markdownToInlineContent(parsingEditor, block.text),
            }];
        case "quote":
            return [{
                type: "quote",
                props: {attribution: block.data?.attribution ?? ""},
                content: markdownToInlineContent(parsingEditor, block.text),
            }];
        case "note":
            return [{
                type: "note",
                props: {variant: block.data.variant},
                content: markdownToInlineContent(parsingEditor, block.text),
            }];
        case "image":
            return [{type: "image", props: {src: block.data.src, alt: block.data.alt, caption: block.text ?? ""}}];
        case "code":
            // BlockNote-internal type is "codeSnippet", not "code" —
            // see blocks/CodeBlock.tsx's top comment.
            return [{
                type: "codeSnippet",
                props: {filename: block.data.filename, language: block.data.language ?? "", code: block.data.code},
            }];
        case "approachList":
            return [{type: "approachList", props: {itemsJson: JSON.stringify(block.data.items)}}];
        case "diagram":
            return [{
                type: "diagram",
                props: {engine: block.data.engine, source: block.data.source, caption: block.text ?? ""}
            }];
        case "list": {
            const itemType: ListItemBlockType = block.data.ordered ? "numberedListItem" : "bulletListItem";
            return block.data.items.map((item) => listItemToPartialBlock(parsingEditor, item, itemType));
        }
    }
}

/**
 * DB `Block[]` → BlockNote's `initialContent` — what `BlockNoteEditor.tsx`
 * passes to `useCreateBlockNote` when opening an existing document. Image/
 * code/approachList props are plain strings already (see their block spec
 * files) — no Markdown parsing involved for those, only for the four
 * block types with real BlockNote rich-text content (`lead`/`heading`/
 * `quote`/`note`).
 *
 * `flatMap`, not `map` — every DB block maps to exactly one editor block
 * EXCEPT `"list"`, which expands to N *sibling* top-level list-item blocks
 * (one per top-level item, each carrying its own nested `children`) — see
 * `blockToPartialBlocks`'s `case "list"` and this file's top comment on
 * `ListItemBlockType`.
 */
export function blocksToPartialBlocks(blocks: Block[]): PortfolioPartialBlock[] {
    const parsingEditor = BlockNoteEditor.create({schema: blockNoteSchema}) as unknown as PortfolioEditor;
    return blocks.flatMap((block) => blockToPartialBlocks(parsingEditor, block));
}

function convertSingleBlock(editor: PortfolioEditor, block: NonListPortfolioBlock): BlockInput {
    switch (block.type) {
        case "lead":
            return {type: "lead", text: inlineContentToMarkdown(editor, block.content)};
        case "paragraph":
            return {type: "paragraph", text: inlineContentToMarkdown(editor, block.content)};
        case "heading":
            // `block.props.level` types as a plain `number` here (the
            // configured `levels: [2, 3]` option — see `../schema.ts` —
            // is enforced by `createHeadingBlockSpec` at runtime, but
            // doesn't narrow the generated prop's TS type down to the
            // literal union); narrow explicitly rather than widen
            // `BlockInput`'s `data.level` to `number` just for this.
            return {
                type: "heading",
                text: inlineContentToMarkdown(editor, block.content),
                data: {level: block.props.level === 3 ? 3 : 2},
            };
        case "quote":
            return {
                type: "quote",
                text: inlineContentToMarkdown(editor, block.content),
                data: block.props.attribution ? {attribution: block.props.attribution} : undefined,
            };
        case "note":
            return {
                type: "note",
                text: inlineContentToMarkdown(editor, block.content),
                data: {variant: block.props.variant},
            };
        case "image":
            return {
                type: "image",
                text: block.props.caption || undefined,
                data: {src: block.props.src, alt: block.props.alt},
            };
        case "codeSnippet":
            return {
                type: "code",
                data: {
                    filename: block.props.filename,
                    language: block.props.language || undefined,
                    code: block.props.code,
                },
            };
        case "approachList":
            return {type: "approachList", data: {items: parseApproachItems(block.props.itemsJson)}};
        case "diagram":
            return {
                type: "diagram",
                text: block.props.caption || undefined,
                data: {engine: block.props.engine, source: block.props.source},
            };
    }
}

/**
 * Converts a FLAT array of sibling editor blocks into `BlockInput[]` —
 * used for both the top-level document AND, recursively, for a list item's
 * own `children` (which is exactly the same kind of flat sibling array,
 * just nested one level down — BlockNote doesn't structurally distinguish
 * "the document" from "a block's children", and neither does this
 * function). Not a plain `.map()` — BlockNote represents an entire
 * bullet/numbered list as N *sibling* blocks in whichever array they live
 * in (nesting lives in each item's own `children`, not in a wrapping "list"
 * node), but this site's DB model stores a whole (flat run of a) list as
 * ONE `"list"` `BlockInput` (see `blocks.ts`'s top comment on `listCore`).
 * Walks the array with an explicit index so it can group each maximal run
 * of the SAME list-item type into one `"list"` — a run ends either at a
 * non-list-item block or at a type change (bullet → numbered with no gap),
 * since one `"list"` can only hold one `ordered` value.
 *
 * Applying this SAME function to a list item's `children` (via
 * `partialBlockToListItem` below), rather than a separate, simpler
 * "flatten to `ListItemInput[]`" pass, is what makes a nested sub-list
 * keep its own `ordered` value (a differently-typed nested list gets its
 * own real `"list"` entry, grouped exactly like a top-level one — not
 * silently inherited from the outer list) AND keeps a nested sub-list in
 * its real position relative to any other attached block (this walks
 * `children` in its one true order — there's no second array for anything
 * to be pulled out of and reordered against).
 */
function blockArrayToBlockInputs(editor: PortfolioEditor, blocks: readonly PortfolioBlock[]): BlockInput[] {
    const inputs: BlockInput[] = [];
    let i = 0;
    while (i < blocks.length) {
        const block = blocks[i];
        if (block.type === "bulletListItem" || block.type === "numberedListItem") {
            const itemType = block.type;
            const items: ListItemInput[] = [];
            while (i < blocks.length && blocks[i].type === itemType) {
                items.push(partialBlockToListItem(editor, blocks[i] as PortfolioBlock & { type: ListItemBlockType }));
                i++;
            }
            inputs.push({type: "list", data: {ordered: itemType === "numberedListItem", items}});
            continue;
        }
        inputs.push(convertSingleBlock(editor, block as NonListPortfolioBlock));
        i++;
    }
    return inputs;
}

function partialBlockToListItem(
    editor: PortfolioEditor,
    block: PortfolioBlock & { type: ListItemBlockType },
): ListItemInput {
    return {
        text: inlineContentToMarkdown(editor, block.content as InlineContent),
        blocks: blockArrayToBlockInputs(editor, block.children),
    };
}

/**
 * The reverse of `blocksToPartialBlocks` — the editor's live document →
 * `BlockInput[]`, what `BlockNoteEditor.tsx` sends up on save. Takes the
 * REAL editor (not a throwaway one) since `blocksToMarkdownLossy` needs the
 * actual document's current inline content, styles included. A thin public
 * alias for `blockArrayToBlockInputs` — kept as a separate exported name
 * since "the whole document" is the one call site outside this file, while
 * the recursive "any block's children" case is this file's own concern.
 */
export function editorBlocksToBlockInputs(editor: PortfolioEditor, blocks: readonly PortfolioBlock[]): BlockInput[] {
    return blockArrayToBlockInputs(editor, blocks);
}
