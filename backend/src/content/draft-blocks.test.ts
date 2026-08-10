import { describe, expect, it } from "vitest";
import type { BlockInput } from "./blocks";
import { toDisplayBlocks } from "./draft-blocks";

describe("toDisplayBlocks", () => {
    it("assigns id/order from array position, preserving every other field", () => {
        const input: BlockInput[] = [
            { type: "lead", text: "Lead." },
            { type: "paragraph", text: "P." },
        ];

        const result = toDisplayBlocks(input);

        expect(result).toEqual([
            { type: "lead", text: "Lead.", id: "draft-0", order: 0 },
            { type: "paragraph", text: "P.", id: "draft-1", order: 1 },
        ]);
    });

    it("returns [] for an empty array, without throwing", () => {
        expect(toDisplayBlocks([])).toEqual([]);
    });

    it("order strictly follows array position, not any other property of the block", () => {
        const input: BlockInput[] = [
            { type: "code", data: { filename: "a.ts", code: "a" } },
            { type: "code", data: { filename: "b.ts", code: "b" } },
            { type: "code", data: { filename: "c.ts", code: "c" } },
        ];

        const result = toDisplayBlocks(input);

        expect(result.map((b) => b.order)).toEqual([0, 1, 2]);
        expect(result.map((b) => b.id)).toEqual(["draft-0", "draft-1", "draft-2"]);
    });

    it("throws if a block doesn't actually satisfy the block schema — a validation boundary, not a blind cast", () => {
        const malformed = [{ type: "not-a-real-type" }] as unknown as BlockInput[];
        expect(() => toDisplayBlocks(malformed)).toThrow();
    });
});
