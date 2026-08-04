import { describe, expect, it } from "vitest";
import type { BlockInput } from "./blocks";
import { countWords, estimateReadMins, extractProse } from "./reading-time";

function words(count: number): string {
    return Array.from({length: count}, (_, i) => `word${ i }`).join(" ");
}

describe("estimateReadMins", () => {
    it("returns 0 for a document with no blocks at all", () => {
        expect(estimateReadMins([])).toBe(0);
    });

    it("returns 0 for blocks that have no readable prose (e.g. only a code block)", () => {
        const blocks: BlockInput[] = [{type: "code", data: {filename: "a.kt", code: words(500)}}];
        expect(estimateReadMins(blocks)).toBe(0);
    });

    it("rounds to the nearest minute at 200 words/minute, minimum 1 for any real prose", () => {
        expect(estimateReadMins([{type: "paragraph", text: words(50)}])).toBe(1);
        expect(estimateReadMins([{type: "paragraph", text: words(200)}])).toBe(1);
        expect(estimateReadMins([{type: "paragraph", text: words(300)}])).toBe(2); // rounds 1.5 up
        expect(estimateReadMins([{type: "paragraph", text: words(1000)}])).toBe(5);
    });

    it("sums prose across every text-bearing block type, but skips code entirely", () => {
        const blocks: BlockInput[] = [
            {type: "lead", text: words(100)},
            {type: "heading", text: words(10)},
            {type: "paragraph", text: words(300)},
            {type: "quote", text: words(50)},
            {type: "note", text: words(40), data: {variant: "info"}},
            {type: "code", data: {filename: "a.kt", code: words(10000)}}, // must not count
            {type: "image", text: words(20), data: {src: "/x.png", alt: "alt"}},
            {type: "approachList", data: {items: [{title: words(5), description: words(5)}]}},
            {type: "list", data: {ordered: false, items: [{text: words(20), blocks: []}]}},
        ];
        // 100 + 10 + 300 + 50 + 40 + 0 + 20 + 10 + 20 = 550 words -> 550/200 = 2.75 -> rounds to 3
        expect(estimateReadMins(blocks)).toBe(3);
    });

    it("counts an image block with no caption as zero words, not an error", () => {
        const blocks: BlockInput[] = [{type: "image", data: {src: "/x.png", alt: "alt"}}];
        expect(estimateReadMins(blocks)).toBe(0);
    });
});

/**
 * Found by mutation testing: testing this logic only through
 * `estimateReadMins`'s rounded-to-the-nearest-minute output hid real gaps —
 * e.g. a missing join separator between approachList items only changes the
 * word count by 1, which almost never moves the rounded minute figure. These
 * test the actual per-case string/count directly instead.
 */
describe("extractProse", () => {
    it("returns the block's own text for lead/paragraph/heading/quote/note blocks", () => {
        expect(extractProse({type: "lead", text: "hello"})).toBe("hello");
        expect(extractProse({type: "paragraph", text: "hello"})).toBe("hello");
        expect(extractProse({type: "heading", text: "hello"})).toBe("hello");
        expect(extractProse({type: "quote", text: "hello"})).toBe("hello");
        expect(extractProse({type: "note", text: "hello", data: {variant: "info"}})).toBe("hello");
    });

    it("returns the image caption, or an empty string when there is none", () => {
        expect(extractProse({type: "image", text: "a cat", data: {src: "/x.png", alt: "alt"}})).toBe("a cat");
        expect(extractProse({type: "image", data: {src: "/x.png", alt: "alt"}})).toBe("");
    });

    it("joins approachList item titles and descriptions with a real space, in order", () => {
        const block: BlockInput = {
            type: "approachList",
            data: {items: [{title: "a", description: "b"}, {title: "c", description: "d"}]},
        };
        expect(extractProse(block)).toBe("a b c d");
    });

    it("returns an empty string for code blocks — code isn't counted as prose", () => {
        expect(extractProse({type: "code", data: {filename: "a.kt", code: "fun main() {}"}})).toBe("");
    });

    it("returns the diagram's caption or empty string when there is none", () => {
        expect(extractProse({
            type: "diagram",
            text: "Fig. 1",
            data: {engine: "mermaid", source: "A --> B"}
        })).toBe("Fig. 1");
        // With empty caption the diagram is not counted
        expect(extractProse({
            type: "diagram",
            data: {engine: "mermaid", source: "A --> B"}
        })).toBe("");
    })

    it("joins list item text in order, flattening a nested sub-list (via `blocks`) depth-first", () => {
        const block: BlockInput = {
            type: "list",
            data: {
                ordered: false,
                items: [
                    {text: "a", blocks: [{type: "list", data: {ordered: true, items: [{text: "b", blocks: []}]}}]},
                    {text: "c", blocks: []},
                ],
            },
        };
        expect(extractProse(block)).toBe("a b c");
    });

    it("returns an empty string for a list whose items have no text and no blocks", () => {
        const block: BlockInput = {type: "list", data: {ordered: true, items: [{text: "", blocks: []}]}};
        expect(extractProse(block)).toBe("");
    });

    it("counts an attached (non-list) block's own prose too — e.g. an image caption nested under a list item", () => {
        const block: BlockInput = {
            type: "list",
            data: {
                ordered: false,
                items: [{text: "a", blocks: [{type: "image", text: "a caption", data: {src: "/x.png", alt: "alt"}}]}],
            },
        };
        expect(extractProse(block)).toBe("a a caption");
    });
});

describe("countWords", () => {
    it("counts words separated by any run of whitespace", () => {
        expect(countWords("one   two\tthree\nfour")).toBe(4);
    });

    it("returns 0 for an empty or whitespace-only string", () => {
        expect(countWords("")).toBe(0);
        expect(countWords("   ")).toBe(0);
    });
});
