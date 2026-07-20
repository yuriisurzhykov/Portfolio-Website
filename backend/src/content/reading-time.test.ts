import { describe, expect, it } from "vitest";
import type { BlockInput } from "./blocks";
import { estimateReadMins } from "./reading-time";

function words(count: number): string {
    return Array.from({ length: count }, (_, i) => `word${ i }`).join(" ");
}

describe("estimateReadMins", () => {
    it("returns 0 for a document with no blocks at all", () => {
        expect(estimateReadMins([])).toBe(0);
    });

    it("returns 0 for blocks that have no readable prose (e.g. only a code block)", () => {
        const blocks: BlockInput[] = [{ type: "code", data: { filename: "a.kt", code: words(500) } }];
        expect(estimateReadMins(blocks)).toBe(0);
    });

    it("rounds to the nearest minute at 200 words/minute, minimum 1 for any real prose", () => {
        expect(estimateReadMins([{ type: "paragraph", text: words(50) }])).toBe(1);
        expect(estimateReadMins([{ type: "paragraph", text: words(200) }])).toBe(1);
        expect(estimateReadMins([{ type: "paragraph", text: words(300) }])).toBe(2); // rounds 1.5 up
        expect(estimateReadMins([{ type: "paragraph", text: words(1000) }])).toBe(5);
    });

    it("sums prose across every text-bearing block type, but skips code entirely", () => {
        const blocks: BlockInput[] = [
            { type: "lead", text: words(100) },
            { type: "heading", text: words(10) },
            { type: "paragraph", text: words(300) },
            { type: "quote", text: words(50) },
            { type: "note", text: words(40), data: { variant: "info" } },
            { type: "code", data: { filename: "a.kt", code: words(10000) } }, // must not count
            { type: "image", text: words(20), data: { src: "/x.png", alt: "alt" } },
            { type: "approachList", data: { items: [{ title: words(5), description: words(5) }] } },
        ];
        // 100 + 10 + 300 + 50 + 40 + 0 + 20 + 10 = 530 words -> 530/200 = 2.65 -> rounds to 3
        expect(estimateReadMins(blocks)).toBe(3);
    });

    it("counts an image block with no caption as zero words, not an error", () => {
        const blocks: BlockInput[] = [{ type: "image", data: { src: "/x.png", alt: "alt" } }];
        expect(estimateReadMins(blocks)).toBe(0);
    });
});
