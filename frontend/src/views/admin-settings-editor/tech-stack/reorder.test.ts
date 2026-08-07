import { describe, expect, it } from "vitest";
import { moveItem } from "./reorder";

describe("moveItem", () => {
    const list = ["a", "b", "c", "d"];

    it("moves an element forward, shifting the ones it passes back by one", () => {
        expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    });

    it("moves an element backward, shifting the ones it passes forward by one", () => {
        expect(moveItem(list, 3, 1)).toEqual(["a", "d", "b", "c"]);
    });

    it("inserts rather than swaps — a long move leaves every other element in its relative order", () => {
        // A swap implementation would return ["d", "b", "c", "a"] here.
        expect(moveItem(list, 0, 3)).toEqual(["b", "c", "d", "a"]);
    });

    it("moves to the last index (inclusive upper bound, not off by one)", () => {
        expect(moveItem(list, 1, 3)).toEqual(["a", "c", "d", "b"]);
    });

    it("moves to index 0 (inclusive lower bound)", () => {
        expect(moveItem(list, 2, 0)).toEqual(["c", "a", "b", "d"]);
    });

    it("returns the same array reference when the target index is the source index", () => {
        expect(moveItem(list, 2, 2)).toBe(list);
    });

    it("returns the same array reference for a target past the end", () => {
        expect(moveItem(list, 0, 4)).toBe(list);
    });

    it("returns the same array reference for a negative target", () => {
        expect(moveItem(list, 1, -1)).toBe(list);
    });

    it("returns the same array reference for a source outside the list", () => {
        expect(moveItem(list, 4, 0)).toBe(list);
        expect(moveItem(list, -1, 0)).toBe(list);
    });

    it("does not mutate the input array", () => {
        moveItem(list, 0, 3);
        expect(list).toEqual(["a", "b", "c", "d"]);
    });
});
