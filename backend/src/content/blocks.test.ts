import { describe, expect, it } from "vitest";
import { parseBlock, parseBlockInputs, parseBlocks } from "./blocks";

describe("parseBlock", () => {
    it("parses a lead block", () => {
        const block = parseBlock({id: "1", order: 0, type: "lead", text: "Hello", data: null});
        expect(block).toEqual({id: "1", order: 0, type: "lead", text: "Hello"});
    });

    it("parses a heading block with data: null — the exact case that broke on real imported data", () => {
        // Regression test: Prisma reads back an unset Json column as `null`,
        // not `undefined`. A heading created without an explicit `data`
        // (the common case — most headings don't override their level) has
        // `data: null` once round-tripped through Postgres, not a missing
        // key. See the comment above `headingCore` in blocks.ts for the
        // full story — this was found by running the Phase 3 import script
        // against a real database, not by any type check.
        const block = parseBlock({id: "1", order: 0, type: "heading", text: "Title", data: null});
        expect(block.type).toBe("heading");
    });

    it("parses a heading block with an explicit level in data", () => {
        const block = parseBlock({id: "1", order: 0, type: "heading", text: "T", data: {level: 3}});
        expect(block.type === "heading" && block.data?.level).toBe(3);
    });

    it("parses a code block (no text field at all)", () => {
        const block = parseBlock({
            id: "1",
            order: 0,
            type: "code",
            text: null,
            data: {filename: "a.kt", language: "kotlin", code: "fun main() {}"},
        });
        expect(block.type === "code" && block.data.filename).toBe("a.kt");
    });

    it("parses an approachList block", () => {
        const block = parseBlock({
            id: "1",
            order: 0,
            type: "approachList",
            text: null,
            data: {items: [{title: "A", description: "B"}]},
        });
        expect(block.type === "approachList" && block.data.items).toHaveLength(1);
    });

    it("parses an image block with a null (missing) caption", () => {
        const block = parseBlock({
            id: "1",
            order: 0,
            type: "image",
            text: null,
            data: {src: "/img.png", alt: "alt"},
        });
        expect(block.type).toBe("image");
    });

    it("pases a diagram block for each valid engine type with its source intact", () => {
        for (const engine of ["mermaid", "plantuml"] as const) {
            const block = parseBlock({
                id: "1",
                order: 0,
                type: "diagram",
                text: null,
                data: {engine, source: "A --> B"},
            });
            expect(block.type === "diagram" && block.data.engine).toBe(engine);
            expect(block.type === "diagram" && block.data.source).toBe("A --> B");
        }
    });

    it("rejects a diagram block with an invalid engine type", () => {
        expect(() =>
            parseBlock({
                id: "1",
                order: 0,
                type: "diagram",
                text: null,
                data: {engine: "graphviz", source: "x"}
            }),
        ).toThrow();
    });

    it("accepts a diagram block with an empty source — an in-progress block, not yet written, must round-trip safely rather than be silently dropped", () => {
        const block = parseBlock({
            id: "1",
            order: 0,
            type: "diagram",
            text: null,
            data: {engine: "mermaid", source: ""},
        });
        expect(block.type === "diagram" && block.data.source).toBe("");
    });


    it("parses a diagram block's optional caption", () => {
        const withCaption = parseBlock({
            id: "1",
            order: 0,
            type: "diagram",
            text: "Fig. 1",
            data: {engine: "mermaid", source: "A --> B"},
        });
        expect(withCaption.type === "diagram" && withCaption.text).toBe("Fig. 1");

        const withoutCaption = parseBlock({
            id: "1",
            order: 0,
            type: "diagram",
            text: null,
            data: {engine: "mermaid", source: "A --> B"},
        });
        expect(withoutCaption.type).toBe("diagram");
    });

    /**
     * Found by mutation testing: "quote" was never parsed at all outside of
     * reading-time.test.ts (a different file, testing a different
     * function) — nothing here proved `quoteCore`'s own schema (the
     * `"quote"` literal, the optional `attribution` field) actually works.
     */
    it("parses a quote block, with and without an attribution", () => {
        const withAttribution = parseBlock({
            id: "1", order: 0, type: "quote", text: "Wise words",
            data: {attribution: "Someone"},
        });
        expect(withAttribution.type === "quote" && withAttribution.data?.attribution).toBe("Someone");

        const withoutAttribution = parseBlock({id: "1", order: 0, type: "quote", text: "Wise words", data: null});
        expect(withoutAttribution.type).toBe("quote");
    });

    /**
     * Found by mutation testing: the only existing "note" test checked
     * REJECTION of a missing `data.variant` — never that a valid variant
     * actually parses through, so the enum's own values were untested.
     */
    it("parses a note block with each valid variant", () => {
        for (const variant of ["info", "warning", "tip"] as const) {
            const block = parseBlock({id: "1", order: 0, type: "note", text: "x", data: {variant}});
            expect(block.type === "note" && block.data.variant).toBe(variant);
        }
    });

    it("rejects a note block with an invalid variant value", () => {
        expect(() =>
            parseBlock({id: "1", order: 0, type: "note", text: "x", data: {variant: "not-a-real-variant"}}),
        ).toThrow();
    });

    /**
     * Found by mutation testing: the existing image test only checked
     * `block.type === "image"`, never that `data.src`/`data.alt` actually
     * survive parsing.
     */
    it("parses an image block's data fields, not just that it's an image", () => {
        const block = parseBlock({
            id: "1", order: 0, type: "image", text: null,
            data: {src: "/img.png", alt: "A cat"},
        });
        expect(block.type === "image" && block.data.src).toBe("/img.png");
        expect(block.type === "image" && block.data.alt).toBe("A cat");
    });

    /**
     * Found by mutation testing: the existing approachList test only
     * checked `items` had length 1 — never the actual title/description
     * content, and never that fewer than 1 item (`.min(1)`) is rejected.
     */
    it("parses approachList item title/description content, not just the count", () => {
        const block = parseBlock({
            id: "1", order: 0, type: "approachList", text: null,
            data: {items: [{title: "Step 1", description: "Do the thing"}]},
        });
        expect(block.type === "approachList" && block.data.items[0]).toEqual({
            title: "Step 1",
            description: "Do the thing",
        });
    });

    it("rejects an approachList block with zero items", () => {
        expect(() =>
            parseBlock({id: "1", order: 0, type: "approachList", text: null, data: {items: []}}),
        ).toThrow();
    });

    it("rejects an unknown block type", () => {
        expect(() => parseBlock({id: "1", order: 0, type: "not-a-real-type", text: null, data: null})).toThrow();
    });

    it("rejects a block missing required fields for its type", () => {
        // "note" requires data.variant — omitting it must fail loudly
        // rather than silently rendering a broken block.
        expect(() => parseBlock({id: "1", order: 0, type: "note", text: "x", data: null})).toThrow();
    });

    it("parseBlocks preserves order and parses every row", () => {
        const blocks = parseBlocks([
            {id: "1", order: 0, type: "heading", text: "A", data: null},
            {id: "2", order: 1, type: "paragraph", text: "B", data: null},
        ]);
        expect(blocks.map((b) => b.type)).toEqual(["heading", "paragraph"]);
    });
});

describe("parseBlockInputs", () => {
    it("accepts the exact shape the admin block editor submits — no id/order", () => {
        const blocks = parseBlockInputs([
            {type: "lead", text: "Lead"},
            {type: "code", data: {filename: "a.kt", code: "fun main() {}"}},
        ]);
        expect(blocks.map((b) => b.type)).toEqual(["lead", "code"]);
    });

    it("still rejects a block missing required fields for its type", () => {
        expect(() => parseBlockInputs([{type: "note", text: "x"}])).toThrow();
    });

    it("rejects id/order if present — the admin editor must not be able to set them directly", () => {
        // Extra keys are stripped/ignored by Zod object parsing by default,
        // not rejected — this test documents that behavior rather than
        // assuming it, since the whole point of BlockInput excluding
        // id/order is that the caller can't dictate row identity or
        // position (position comes from array order at save time instead).
        const [block] = parseBlockInputs([{type: "lead", text: "x", id: "should-be-ignored", order: 99}]);
        expect(block).not.toHaveProperty("id");
        expect(block).not.toHaveProperty("order");
    });
});
