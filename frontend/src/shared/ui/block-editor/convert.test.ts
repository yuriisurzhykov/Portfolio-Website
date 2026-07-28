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
