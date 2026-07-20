import { BlockNoteEditor } from "@blocknote/core";
import type { Block, BlockInput } from "@portfolio/backend";
import { blockNoteSchema, type PortfolioBlockNoteEditor } from "./schema";
import { parseApproachItems } from "./blocks/ApproachListBlock";

type PortfolioEditor = PortfolioBlockNoteEditor;
export type PortfolioBlock = typeof blockNoteSchema.Block;
type PortfolioPartialBlock = typeof blockNoteSchema.PartialBlock;
type InlineContent = PortfolioBlock["content"];

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
 */
function markdownToInlineContent(parsingEditor: PortfolioEditor, text: string): InlineContent {
    if (!text) {
        return [];
    }
    const [parsed] = parsingEditor.tryParseMarkdownToBlocks(text);
    return (parsed?.content as InlineContent | undefined) ?? [];
}

/** The reverse of `markdownToInlineContent` — same "wrap as a bare paragraph first" reasoning, just serializing instead of parsing. */
function inlineContentToMarkdown(editor: PortfolioEditor, content: InlineContent): string {
    return editor.blocksToMarkdownLossy([{ type: "paragraph", content } as PortfolioPartialBlock]).trim();
}

/**
 * DB `Block[]` → BlockNote's `initialContent` — what `BlockNoteEditor.tsx`
 * passes to `useCreateBlockNote` when opening an existing document. Image/
 * code/approachList props are plain strings already (see their block spec
 * files) — no Markdown parsing involved for those, only for the four
 * block types with real BlockNote rich-text content (`lead`/`heading`/
 * `quote`/`note`).
 */
export function blocksToPartialBlocks(blocks: Block[]): PortfolioPartialBlock[] {
    const parsingEditor = BlockNoteEditor.create({ schema: blockNoteSchema }) as unknown as PortfolioEditor;

    return blocks.map((block): PortfolioPartialBlock => {
        switch (block.type) {
            case "lead":
            case "paragraph":
                return { type: block.type, content: markdownToInlineContent(parsingEditor, block.text) };
            case "heading":
                return {
                    type: "heading",
                    props: { level: block.data?.level ?? 2 },
                    content: markdownToInlineContent(parsingEditor, block.text),
                };
            case "quote":
                return {
                    type: "quote",
                    props: { attribution: block.data?.attribution ?? "" },
                    content: markdownToInlineContent(parsingEditor, block.text),
                };
            case "note":
                return {
                    type: "note",
                    props: { variant: block.data.variant },
                    content: markdownToInlineContent(parsingEditor, block.text),
                };
            case "image":
                return { type: "image", props: { src: block.data.src, alt: block.data.alt, caption: block.text ?? "" } };
            case "code":
                // BlockNote-internal type is "codeSnippet", not "code" —
                // see blocks/CodeBlock.tsx's top comment.
                return {
                    type: "codeSnippet",
                    props: { filename: block.data.filename, language: block.data.language ?? "", code: block.data.code },
                };
            case "approachList":
                return { type: "approachList", props: { itemsJson: JSON.stringify(block.data.items) } };
        }
    });
}

/**
 * The reverse — the editor's live document → `BlockInput[]`, what
 * `BlockNoteEditor.tsx` sends up on save. Takes the REAL editor (not a
 * throwaway one) since `blocksToMarkdownLossy` needs the actual document's
 * current inline content, styles included.
 */
export function editorBlocksToBlockInputs(editor: PortfolioEditor, blocks: readonly PortfolioBlock[]): BlockInput[] {
    return blocks.map((block): BlockInput => {
        switch (block.type) {
            case "lead":
                return { type: "lead", text: inlineContentToMarkdown(editor, block.content) };
            case "paragraph":
                return { type: "paragraph", text: inlineContentToMarkdown(editor, block.content) };
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
                    data: { level: block.props.level === 3 ? 3 : 2 },
                };
            case "quote":
                return {
                    type: "quote",
                    text: inlineContentToMarkdown(editor, block.content),
                    data: block.props.attribution ? { attribution: block.props.attribution } : undefined,
                };
            case "note":
                return {
                    type: "note",
                    text: inlineContentToMarkdown(editor, block.content),
                    data: { variant: block.props.variant },
                };
            case "image":
                return {
                    type: "image",
                    text: block.props.caption || undefined,
                    data: { src: block.props.src, alt: block.props.alt },
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
                return { type: "approachList", data: { items: parseApproachItems(block.props.itemsJson) } };
        }
    });
}
