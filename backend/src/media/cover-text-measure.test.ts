import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTextMeasurer, truncateWithEllipsis, wrapText, type TextMeasurer } from "./cover-text-measure";

const INTER_800 = readFileSync(join(import.meta.dirname, "fonts", "Inter-subset-800.ttf"));

describe("createTextMeasurer", () => {
    it("measures zero width for an empty string", () => {
        expect(createTextMeasurer(INTER_800, 100).widthOf("")).toBe(0);
    });

    it("pins the exact width of a known string at a known size, against the real committed font file", () => {
        // Golden value from the real, committed Inter-subset-800.ttf — this
        // is exactly what gets embedded and rasterized (see the Day-0 gate
        // in the plan), not an approximation, so pinning it here catches
        // both a code regression AND a silently-swapped font file.
        expect(createTextMeasurer(INTER_800, 100).widthOf("AA")).toBeCloseTo(155.37109375, 5);
    });

    it("scales linearly with font size", () => {
        const at50 = createTextMeasurer(INTER_800, 50).widthOf("AAAA");
        const at100 = createTextMeasurer(INTER_800, 100).widthOf("AAAA");
        expect(at100 / at50).toBeCloseTo(2, 10);
    });

    it("is longer for a longer string of the same repeated character (never negative, never non-monotonic)", () => {
        const measurer = createTextMeasurer(INTER_800, 46);
        expect(measurer.widthOf("A")).toBeGreaterThan(0);
        expect(measurer.widthOf("AA")).toBeGreaterThan(measurer.widthOf("A"));
        expect(measurer.widthOf("AAA")).toBeGreaterThan(measurer.widthOf("AA"));
    });
});

/** A `TextMeasurer` with an exact, hand-controlled width per character — isolates `wrapText`'s packing/truncation logic from any real font's specific metrics, the same way `cover-palette.test.ts`'s `sequencePrng` isolates palette math from PRNG specifics. */
function fixedWidthMeasurer(pxPerChar: number): TextMeasurer {
    return { widthOf: (text: string) => text.length * pxPerChar };
}

describe("truncateWithEllipsis", () => {
    it("stops shrinking exactly when line+ellipsis first fits (boundary is '>', not '>=')", () => {
        // "abcdef" (6 chars) at 10px/char, maxWidthPx=15: the loop must
        // shrink all the way down to a SINGLE character ("a"), since even
        // "a…" (2 chars = 20px) exceeds 15px... wait: (1+1)*10=20>15 is
        // still true, so the length>1 guard is what actually stops it, not
        // the width check — this is the intended boundary case: verifies
        // the loop stops at length 1 rather than continuing to length 0.
        expect(truncateWithEllipsis(fixedWidthMeasurer(10), "abcdef", 15)).toBe("a…");
    });

    it("treats length <= 1 as the stopping boundary (kills >= / <= mutants on the length guard)", () => {
        // With the (correct) `length > 1` guard, the loop must stop the
        // moment `truncated` reaches a single character, regardless of
        // whether the width check would still want to keep shrinking (it
        // does here — a `>= 1` mutant would shrink one step further, to
        // the empty string, which is a directly observable difference).
        expect(truncateWithEllipsis(fixedWidthMeasurer(10), "abcdef", 1)).toBe("a…");
    });

    it("strips ALL trailing whitespace left after truncation, not just one character", () => {
        // "AB CD" at 10px/char, maxWidthPx=41: shrinks AB CD(60) -> AB C(50)
        // -> AB␣(40, first width <= 41) — landing exactly on a trailing
        // space, which the final `.replace(/\s+$/, "")` must strip before
        // appending the ellipsis.
        expect(truncateWithEllipsis(fixedWidthMeasurer(10), "AB CD", 41)).toBe("AB…");
    });

    it("strips a run of MULTIPLE trailing spaces entirely, not just the last one (kills a `\\s+$` -> `\\s$` mutant)", () => {
        // "AB  CD" (two spaces) at maxWidthPx=50 shrinks down to "AB  "
        // (two trailing spaces) before the width check passes — a `\s$`
        // mutant would strip only the LAST space, leaving one behind.
        expect(truncateWithEllipsis(fixedWidthMeasurer(10), "AB  CD", 50)).toBe("AB…");
    });

    it("treats a width EXACTLY at maxWidthPx as fitting, not overflowing (kills a `>` -> `>=` mutant)", () => {
        // "AB…" at 10px/char = exactly 30px. maxWidthPx=30 must be treated
        // as "fits" (condition is `> maxWidthPx`, not `>=`) — the loop body
        // must never even run.
        expect(truncateWithEllipsis(fixedWidthMeasurer(10), "AB", 30)).toBe("AB…");
    });

    it("does not strip a non-whitespace character immediately before the end", () => {
        // Guards against a mutant that widens the strip regex (e.g. to
        // `\S+$`, which would eat real characters, not just whitespace).
        expect(truncateWithEllipsis(fixedWidthMeasurer(10), "abcdef", 100)).toBe("abcdef…");
    });

    it("only strips TRAILING whitespace, never whitespace elsewhere in the line", () => {
        // Guards against a mutant that drops the `$` anchor (e.g. `\s+`
        // alone), which would strip the FIRST run of whitespace instead
        // of specifically the trailing one.
        const result = truncateWithEllipsis(fixedWidthMeasurer(10), "a b", 100);
        expect(result).toBe("a b…");
    });

    it("never returns a truncated line whose ellipsis-suffixed width exceeds maxWidthPx", () => {
        const measurer = fixedWidthMeasurer(10);
        const result = truncateWithEllipsis(measurer, "a very long line that needs shrinking", 80);
        expect(measurer.widthOf(result)).toBeLessThanOrEqual(80);
    });
});

describe("wrapText", () => {
    it("returns an empty array for empty/whitespace-only text", () => {
        const measurer = fixedWidthMeasurer(10);
        expect(wrapText(measurer, "", 1000, 3)).toEqual([]);
        expect(wrapText(measurer, "   ", 1000, 3)).toEqual([]);
    });

    it("keeps everything on one line when it all fits", () => {
        const measurer = fixedWidthMeasurer(10);
        expect(wrapText(measurer, "one two three", 1000, 3)).toEqual(["one two three"]);
    });

    it("wraps onto a new line exactly when the next word would overflow maxWidthPx", () => {
        // Each char = 10px. "one two" = 7 chars = 70px, exactly at the limit
        // -> fits (boundary is "> maxWidth", not ">="). Adding "three" would
        // make it 13 chars = 130px > 70, so "three" wraps.
        const measurer = fixedWidthMeasurer(10);
        expect(wrapText(measurer, "one two three", 70, 3)).toEqual(["one two", "three"]);
    });

    it("treats a boundary EXACTLY at maxWidthPx as fitting, not overflowing (> not >=)", () => {
        // Kills a mutant flipping `> maxWidthPx` to `>= maxWidthPx`.
        const measurer = fixedWidthMeasurer(10);
        expect(wrapText(measurer, "ab cd", 50, 3)).toEqual(["ab cd"]); // exactly 50px
    });

    it("always keeps at least one word per line even if that single word alone overflows", () => {
        const measurer = fixedWidthMeasurer(10);
        // "reallylongword" alone is 140px, way over a 50px max — still gets
        // its own line rather than being force-split mid-word or dropped.
        expect(wrapText(measurer, "hi reallylongword ok", 50, 3)).toEqual(["hi", "reallylongword", "ok"]);
    });

    it("truncates with an ellipsis on the LAST allowed line when content overflows maxLines", () => {
        const measurer = fixedWidthMeasurer(10);
        const lines = wrapText(measurer, "one two three four five six", 70, 2);
        expect(lines).toHaveLength(2);
        expect(lines[0]).toBe("one two");
        expect(lines[1].endsWith("…")).toBe(true);
        // Truncated to fit within maxWidthPx INCLUDING the ellipsis character.
        expect(measurer.widthOf(lines[1])).toBeLessThanOrEqual(70);
    });

    it("does not add an ellipsis when content exactly fits within maxLines", () => {
        const measurer = fixedWidthMeasurer(10);
        // "one two three" (13 chars=130px) fits on line 1 at maxWidth=140;
        // "four" alone becomes line 2 — both allowed words placed, nothing
        // left over to truncate.
        const lines = wrapText(measurer, "one two three four", 140, 2);
        expect(lines).toEqual(["one two three", "four"]);
    });

    it("returns nothing at all for maxLines=0, even when content would otherwise fit on one line", () => {
        // The only realistic way to distinguish the final `lines.slice(0,
        // maxLines)` from a mutant that just `return`s `lines` unsliced:
        // with maxLines=0, the in-loop truncate-and-return-early path never
        // triggers (`lines.length === 0` is never true right after a
        // push, since a push always makes it >= 1), so an unsliced
        // `lines` would incorrectly come back non-empty here.
        expect(wrapText(fixedWidthMeasurer(10), "one two three", 1000, 0)).toEqual([]);
    });

    it("never returns more than maxLines lines", () => {
        const measurer = fixedWidthMeasurer(10);
        const lines = wrapText(measurer, "a b c d e f g h i j k l m n o p", 20, 1);
        expect(lines).toHaveLength(1);
        expect(lines[0].endsWith("…")).toBe(true);
    });

    it("is a pure function: identical inputs always produce identical output", () => {
        const measurer = fixedWidthMeasurer(8);
        const a = wrapText(measurer, "Notes on FlowBus: why I built an event bus", 200, 3);
        const b = wrapText(measurer, "Notes on FlowBus: why I built an event bus", 200, 3);
        expect(a).toEqual(b);
    });

    it("wraps real text against the real committed font without throwing, for a range of lengths", () => {
        const measurer = createTextMeasurer(INTER_800, 46);
        const titles = [
            "A short update",
            "Notes on FlowBus: why I built an event bus",
            "Debugging a flaky Wi-Fi handoff between two access points on the same subnet, three years later",
        ];
        for (const title of titles) {
            const lines = wrapText(measurer, title, 700, 3);
            expect(lines.length).toBeGreaterThan(0);
            expect(lines.length).toBeLessThanOrEqual(3);
            for (const line of lines) {
                expect(measurer.widthOf(line)).toBeLessThanOrEqual(700 + 1); // +1px float slack
            }
        }
    });
});
