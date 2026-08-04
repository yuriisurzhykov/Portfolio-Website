import { describe, expect, it } from "vitest";
import { BlockNoteEditor } from "@blocknote/core";
import type { Block } from "@portfolio/backend";
import { blockNoteSchema } from "./schema";
import { blocksToPartialBlocks, editorBlocksToBlockInputs } from "./convert";

const oneOfEachBlockType: Block[] = [
    { id: "1", order: 0, type: "lead", text: "A **bold** lead." },
    { id: "2", order: 1, type: "heading", text: "A heading", data: { level: 2 } },
    { id: "3", order: 2, type: "paragraph", text: "A paragraph with *italic*." },
    { id: "4", order: 3, type: "quote", text: "A quote.", data: { attribution: "Someone" } },
    { id: "5", order: 4, type: "note", text: "A note.", data: { variant: "tip" } },
    { id: "6", order: 5, type: "image", text: "A caption", data: { src: "/x.png", alt: "alt text" } },
    { id: "7", order: 6, type: "code", data: { filename: "a.kt", language: "kotlin", code: "fun main() {}" } },
    { id: "8", order: 7, type: "approachList", data: { items: [{ title: "T", description: "D" }] } },
    { id: "9", order: 8, type: "list", data: { ordered: false, items: [{ text: "An item", children: [], blocks: [] }] } },
];

describe("blocksToPartialBlocks + BlockNoteEditor.create — the real regression this guards", () => {
    it("constructs a real editor with every block type present, without throwing", () => {
        // This is the exact crash reported live on `/admin/journal/[slug]/edit`
        // for any post with a "code" block: the custom code block was
        // registered under the BlockNote-internal type `"code"`, which
        // collides with `defaultStyleSpecs`' inline "code" MARK —
        // ProseMirror rejects a schema where one name is both a node and a
        // mark (`RangeError: code can not be both a node and a mark`),
        // surfacing as `BlockNoteEditor.create()` throwing "Error creating
        // document from blocks passed as `initialContent`" even for the
        // unrelated throwaway parsing editor `blocksToPartialBlocks`
        // itself constructs (see its own comment) — NOT specific to the
        // "code" block's own conversion logic, which is why a type-level
        // review of `convert.ts`'s `case "code"` branch alone would never
        // have caught it. Fixed by registering it as `"codeSnippet"`
        // internally (`blocks/CodeBlock.tsx`) while keeping the storage
        // format's `type: "code"` unchanged — this test constructs the
        // REAL editor (not just calls the conversion functions) specifically
        // so a future rename collision like this fails loudly here again,
        // not only live in a browser.
        const initialContent = blocksToPartialBlocks(oneOfEachBlockType);
        expect(() => BlockNoteEditor.create({ schema: blockNoteSchema, initialContent })).not.toThrow();
    });

    it("round-trips every block type's content and data through the real editor unchanged", () => {
        const initialContent = blocksToPartialBlocks(oneOfEachBlockType);
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema, initialContent });

        const result = editorBlocksToBlockInputs(editor, editor.document);

        expect(result.map((b) => b.type)).toEqual(oneOfEachBlockType.map((b) => b.type));
        expect(result[0]).toMatchObject({ type: "lead", text: "A **bold** lead." });
        expect(result[1]).toMatchObject({ type: "heading", text: "A heading", data: { level: 2 } });
        expect(result[2]).toMatchObject({ type: "paragraph", text: "A paragraph with *italic*." });
        expect(result[3]).toMatchObject({ type: "quote", text: "A quote.", data: { attribution: "Someone" } });
        expect(result[4]).toMatchObject({ type: "note", text: "A note.", data: { variant: "tip" } });
        expect(result[5]).toMatchObject({ type: "image", text: "A caption", data: { src: "/x.png", alt: "alt text" } });
        expect(result[6]).toMatchObject({ type: "code", data: { filename: "a.kt", language: "kotlin", code: "fun main() {}" } });
        expect(result[7]).toMatchObject({ type: "approachList", data: { items: [{ title: "T", description: "D" }] } });
        expect(result[8]).toMatchObject({ type: "list", data: { ordered: false, items: [{ text: "An item" }] } });
    });

    /**
     * Found by mutation testing: every sample block above always provided
     * its optional/nullable field explicitly (`data.level`, `data.
     * attribution`, a caption, a language) — none of the `?? default`
     * fallbacks for a genuinely missing (`null`/absent) field were ever
     * exercised.
     */
    it("defaults a heading with no data to level 2, and round-trips an explicit level 3", () => {
        const blocks: Block[] = [
            { id: "1", order: 0, type: "heading", text: "Default level", data: null },
            { id: "2", order: 1, type: "heading", text: "Explicit level 3", data: { level: 3 } },
        ];
        const initialContent = blocksToPartialBlocks(blocks);
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema, initialContent });
        const result = editorBlocksToBlockInputs(editor, editor.document);
        expect(result[0]).toMatchObject({ type: "heading", data: { level: 2 } });
        expect(result[1]).toMatchObject({ type: "heading", data: { level: 3 } });
    });

    it("defaults a quote with no attribution to an empty string, distinct from an omitted one on the way back", () => {
        const blocks: Block[] = [{ id: "1", order: 0, type: "quote", text: "No attribution here.", data: null }];
        const initialContent = blocksToPartialBlocks(blocks);
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema, initialContent });
        const result = editorBlocksToBlockInputs(editor, editor.document);
        expect(result[0]).toMatchObject({ type: "quote", data: undefined });
    });

    it("defaults an image with no caption and a code block with no language", () => {
        const blocks: Block[] = [
            { id: "1", order: 0, type: "image", text: null, data: { src: "/x.png", alt: "alt" } },
            { id: "2", order: 1, type: "code", data: { filename: "a.kt", code: "fun main() {}" } },
        ];
        const initialContent = blocksToPartialBlocks(blocks);
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema, initialContent });
        const result = editorBlocksToBlockInputs(editor, editor.document);
        expect(result[0]).toMatchObject({ type: "image", text: undefined });
        expect(result[1]).toMatchObject({ type: "code", data: { language: undefined } });
    });

    it("round-trips a block with empty text as empty inline content, without needing the markdown parser to produce anything", () => {
        const blocks: Block[] = [{ id: "1", order: 0, type: "lead", text: "" }];
        const initialContent = blocksToPartialBlocks(blocks);
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema, initialContent });
        const result = editorBlocksToBlockInputs(editor, editor.document);
        expect(result[0]).toMatchObject({ type: "lead", text: "" });
    });

    it("round-trips a nested list, preserving ordered/unordered, item text (with marks), and multi-level nesting", () => {
        const blocks: Block[] = [
            {
                id: "1", order: 0, type: "list",
                data: {
                    ordered: false,
                    items: [
                        {
                            text: "A **bold** top-level item",
                            children: [{
                                text: "A child item",
                                children: [{ text: "A grandchild item", children: [], blocks: [] }],
                                blocks: [],
                            }],
                            blocks: [],
                        },
                        { text: "A second top-level item", children: [], blocks: [] },
                    ],
                },
            },
        ];
        const initialContent = blocksToPartialBlocks(blocks);
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema, initialContent });
        const result = editorBlocksToBlockInputs(editor, editor.document);

        expect(result).toHaveLength(1);
        const list = result[0];
        expect(list.type === "list" && list.data.ordered).toBe(false);
        expect(list.type === "list" && list.data.items[0].text).toBe("A **bold** top-level item");
        expect(list.type === "list" && list.data.items[0].children[0].text).toBe("A child item");
        expect(list.type === "list" && list.data.items[0].children[0].children[0].text).toBe("A grandchild item");
        expect(list.type === "list" && list.data.items[1].text).toBe("A second top-level item");
    });

    it("round-trips an ordered list distinctly from an unordered one", () => {
        const blocks: Block[] = [
            { id: "1", order: 0, type: "list", data: { ordered: true, items: [{ text: "First", children: [], blocks: [] }] } },
        ];
        const initialContent = blocksToPartialBlocks(blocks);
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema, initialContent });
        const result = editorBlocksToBlockInputs(editor, editor.document);
        expect(result[0]).toMatchObject({ type: "list", data: { ordered: true } });
    });

    /**
     * A run boundary test, not just "one list works" — proves the grouping
     * loop in `editorBlocksToBlockInputs` actually STOPS a run at a
     * non-list-item block and STARTS a new one afterwards, rather than
     * merging every list-item block in the document into a single "list".
     */
    it("splits into separate list blocks when interrupted by a non-list block, rather than merging them", () => {
        const blocks: Block[] = [
            { id: "1", order: 0, type: "list", data: { ordered: false, items: [{ text: "First list item", children: [], blocks: [] }] } },
            { id: "2", order: 1, type: "paragraph", text: "Interrupting paragraph" },
            { id: "3", order: 2, type: "list", data: { ordered: false, items: [{ text: "Second list item", children: [], blocks: [] }] } },
        ];
        const initialContent = blocksToPartialBlocks(blocks);
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema, initialContent });
        const result = editorBlocksToBlockInputs(editor, editor.document);

        expect(result.map((b) => b.type)).toEqual(["list", "paragraph", "list"]);
        expect(result[0].type === "list" && result[0].data.items[0].text).toBe("First list item");
        expect(result[2].type === "list" && result[2].data.items[0].text).toBe("Second list item");
    });

    /**
     * Regression test for the gap flagged in the self-review of the
     * previous session: a non-list block (image/code/diagram/approachList)
     * Tab-nested under a list item used to lose its structure entirely on
     * save — either flattened to plain text or dropped outright. This
     * round-trips through the REAL editor, exercising both directions
     * (`blocksToPartialBlocks` builds the BlockNote `children` tree,
     * `editorBlocksToBlockInputs` reads it back via `childToAttachedBlock`).
     */
    it("round-trips a non-list block (an image) attached to a list item via `blocks`, preserving its structure", () => {
        const blocks: Block[] = [
            {
                id: "1", order: 0, type: "list",
                data: {
                    ordered: false,
                    items: [{
                        text: "An item with an image under it",
                        children: [],
                        blocks: [{ type: "image", data: { src: "/x.png", alt: "alt text" } }],
                    }],
                },
            },
        ];
        const initialContent = blocksToPartialBlocks(blocks);
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema, initialContent });

        // The image should be a real editor block, nested as a `children` entry.
        const listItemBlock = editor.document[0];
        expect(listItemBlock.type).toBe("bulletListItem");
        expect(listItemBlock.children).toHaveLength(1);
        expect(listItemBlock.children[0]).toMatchObject({ type: "image", props: { src: "/x.png", alt: "alt text" } });

        const result = editorBlocksToBlockInputs(editor, editor.document);
        expect(result).toHaveLength(1);
        const list = result[0];
        expect(list.type === "list" && list.data.items[0].blocks[0]).toMatchObject({
            type: "image",
            data: { src: "/x.png", alt: "alt text" },
        });
    });

    it("keeps an attached (non-list) block SEPARATE from real sub-list `children`, even when both are nested under the same item", () => {
        const blocks: Block[] = [
            {
                id: "1", order: 0, type: "list",
                data: {
                    ordered: false,
                    items: [{
                        text: "Parent item",
                        children: [{ text: "A real sub-item", children: [], blocks: [] }],
                        blocks: [{ type: "code", data: { filename: "a.kt", code: "fun main() {}" } }],
                    }],
                },
            },
        ];
        const initialContent = blocksToPartialBlocks(blocks);
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema, initialContent });
        const result = editorBlocksToBlockInputs(editor, editor.document);

        const item = result[0].type === "list" ? result[0].data.items[0] : undefined;
        expect(item?.children).toHaveLength(1);
        expect(item?.children[0].text).toBe("A real sub-item");
        expect(item?.blocks).toHaveLength(1);
        expect(item?.blocks[0]).toMatchObject({ type: "code", data: { filename: "a.kt", code: "fun main() {}" } });
    });

    /**
     * A type-change boundary, not just an interrupting block — a bullet run
     * directly followed by a numbered run (no other block in between) must
     * still become two "list" blocks, since one block can only store a
     * single `ordered` value.
     */
    it("splits into separate list blocks when the item type changes from bullet to numbered with no gap", () => {
        const blocks: Block[] = [
            { id: "1", order: 0, type: "list", data: { ordered: false, items: [{ text: "Bullet item", children: [], blocks: [] }] } },
            { id: "2", order: 1, type: "list", data: { ordered: true, items: [{ text: "Numbered item", children: [], blocks: [] }] } },
        ];
        const initialContent = blocksToPartialBlocks(blocks);
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema, initialContent });
        const result = editorBlocksToBlockInputs(editor, editor.document);

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({ type: "list", data: { ordered: false } });
        expect(result[1]).toMatchObject({ type: "list", data: { ordered: true } });
    });

    /**
     * Regression test for a real bug found live (see `stripDanglingTrailingHardBreak`'s
     * comment in convert.ts): a hard break (Shift+Enter) followed by the
     * trailing whitespace artifact some browsers leave in an emptied
     * contenteditable line left a bare, meaningless "\" as the saved text's
     * last character. Uses `tryParseHTMLToBlocks` to feed the editor the
     * EXACT HTML shape verified live to trigger it, not a hand-built
     * assumption of what a hard break "should" parse to.
     */
    it("strips a dangling trailing backslash left by a hard break with a trailing whitespace artifact", () => {
        for (const html of ["<p>Line1<br> </p>", "<p>Line1<br>&nbsp;</p>"]) {
            const parsingEditor = BlockNoteEditor.create({ schema: blockNoteSchema });
            const initialContent = parsingEditor.tryParseHTMLToBlocks(html);
            const editor = BlockNoteEditor.create({ schema: blockNoteSchema, initialContent });
            const result = editorBlocksToBlockInputs(editor, editor.document);
            expect(result[0]).toMatchObject({ type: "paragraph", text: "Line1" });
        }
    });

    it("a plain trailing hard break with no whitespace artifact already round-trips clean (no regression)", () => {
        const parsingEditor = BlockNoteEditor.create({ schema: blockNoteSchema });
        const initialContent = parsingEditor.tryParseHTMLToBlocks("<p>Line1<br></p>");
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema, initialContent });
        const result = editorBlocksToBlockInputs(editor, editor.document);
        expect(result[0]).toMatchObject({ type: "paragraph", text: "Line1" });
    });

    it("preserves a hard break in the MIDDLE of the text — only a dangling TRAILING one is stripped", () => {
        const parsingEditor = BlockNoteEditor.create({ schema: blockNoteSchema });
        const initialContent = parsingEditor.tryParseHTMLToBlocks("<p>Line1<br>Line2</p>");
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema, initialContent });
        const result = editorBlocksToBlockInputs(editor, editor.document);
        expect(result[0]).toMatchObject({ type: "paragraph", text: "Line1\\\nLine2" });
    });

    /**
     * Regression test for `CodeBlock.tsx`/`DiagramBlock.tsx`'s
     * `toExternalHTML` (see their own comments): without it, copying/
     * dragging a WHOLE selected code/diagram block exported the edit-mode
     * FORM markup itself as "the code", since `toExternalHTML` falls back
     * to `render` when absent (see `@blocknote/react`'s
     * `createReactBlockSpec`). Exercises the exact exporter method the real
     * copy-to-clipboard path uses (`blocksToMarkdownLossy`, same as
     * `copyExtension.ts`'s `cleanHTMLToMarkdown` call), not just a
     * hand-inspection of the JSX.
     */
    it("exports a codeSnippet block as a real fenced code block, not its edit-mode form markup", () => {
        const editor = BlockNoteEditor.create({
            schema: blockNoteSchema,
            initialContent: [{ type: "codeSnippet", props: { filename: "a.kt", language: "kotlin", code: "fun main() {}" } }],
        });
        const markdown = editor.blocksToMarkdownLossy(editor.document);
        expect(markdown.trim()).toBe("```kotlin\nfun main() {}\n```");
    });

    it("exports a diagram block as a real fenced ```mermaid block, not its edit-mode form markup", () => {
        const editor = BlockNoteEditor.create({
            schema: blockNoteSchema,
            initialContent: [{ type: "diagram", props: { engine: "mermaid", source: "graph TD;\nA-->B;", caption: "" } }],
        });
        const markdown = editor.blocksToMarkdownLossy(editor.document);
        expect(markdown.trim()).toBe("```mermaid\ngraph TD;\nA-->B;\n```");
    });

    it("constructs a real editor with NO initial blocks (new post/case study), without throwing", () => {
        // `blocksToPartialBlocks([])` is `[]` — passed straight to
        // `BlockNoteEditor.create()` as `initialContent`, BlockNote itself
        // throws ("initialContent must be a non-empty array of blocks"),
        // by design (empty array vs. "no opinion, use your own default" are
        // different things to it). `BlockNoteEditor.tsx` guards against
        // this (`initialContent.length > 0 ? initialContent : undefined`)
        // — this test exercises that same substitution, not the bare `[]`.
        const initialContent = blocksToPartialBlocks([]);
        expect(() => BlockNoteEditor.create({
            schema: blockNoteSchema,
            initialContent: initialContent.length > 0 ? initialContent : undefined,
        })).not.toThrow();
    });
});
