import { describe, expect, it } from "vitest";
import { buildTitleTextLayout, renderTitleTextLayer } from "./cover-title-text";
import type { TextMeasurer } from "./cover-text-measure";

/** Same hand-controlled measurer as `cover-text-measure.test.ts` — isolates layout math from any real font's specific metrics. */
function fixedWidthMeasurer(pxPerChar: number): TextMeasurer {
    return { widthOf: (text: string) => text.length * pxPerChar };
}

describe("buildTitleTextLayout", () => {
    it("returns null for a blank title, rendering no layer at all", () => {
        expect(buildTitleTextLayout(fixedWidthMeasurer(10), "", 1200, 630, 0.2)).toBeNull();
        expect(buildTitleTextLayout(fixedWidthMeasurer(10), "   ", 1200, 630, 0.2)).toBeNull();
    });

    it("pins the exact single-line layout for a fixed-width measurer", () => {
        const layout = buildTitleTextLayout(fixedWidthMeasurer(10), "one two three four five six", 1200, 630, 0.2);
        expect(layout).not.toBeNull();
        expect(layout!.lines).toEqual([{ text: "one two three four five six", y: 326.5 }]);
        expect(layout!.x).toBe(56);
        expect(layout!.scrim).toEqual({ x: 30, y: 269.5, width: 322, height: expect.closeTo(86.4, 5), color: "#050506" });
    });

    it("stacks wrapped lines with a consistent line height (fontSize * 1.2)", () => {
        const layout = buildTitleTextLayout(fixedWidthMeasurer(30), "one two three four five six", 1200, 630, 0.2);
        expect(layout!.lines).toHaveLength(2);
        expect(layout!.lines[1].y - layout!.lines[0].y).toBeCloseTo(46 * 1.2);
    });

    it("uses white text on a dark/muted base, dark text on a light base", () => {
        const dark = buildTitleTextLayout(fixedWidthMeasurer(10), "hi", 1200, 630, 0.2);
        const light = buildTitleTextLayout(fixedWidthMeasurer(10), "hi", 1200, 630, 0.9);
        expect(dark!.color).toBe("#ffffff");
        expect(light!.color).toBe("#0b0b0d");
    });

    it("treats exactly 0.55 as still 'dark' (> threshold, not >=)", () => {
        // Kills a mutant flipping `> LIGHT_BACKGROUND_THRESHOLD` to `>=`.
        const atThreshold = buildTitleTextLayout(fixedWidthMeasurer(10), "hi", 1200, 630, 0.55);
        const justAbove = buildTitleTextLayout(fixedWidthMeasurer(10), "hi", 1200, 630, 0.5500001);
        expect(atThreshold!.color).toBe("#ffffff");
        expect(justAbove!.color).toBe("#0b0b0d");
    });

    it("also flips the scrim colour to match (opposite of the text colour)", () => {
        const dark = buildTitleTextLayout(fixedWidthMeasurer(10), "hi", 1200, 630, 0.2);
        const light = buildTitleTextLayout(fixedWidthMeasurer(10), "hi", 1200, 630, 0.9);
        expect(dark!.scrim!.color).toBe("#050506");
        expect(light!.scrim!.color).toBe("#ffffff");
    });

    it("sizes the scrim width to the WIDEST line, not the first or last", () => {
        const measurer = fixedWidthMeasurer(10);
        const layout = buildTitleTextLayout(measurer, "short then a much longer second line", 400, 630, 0.2);
        const widest = Math.max(...layout!.lines.map((line) => measurer.widthOf(line.text)));
        expect(layout!.scrim!.width).toBeCloseTo(widest + 52); // 2 * SCRIM_PADDING (26)
    });

    it("never produces more than 3 lines even for very long text", () => {
        const layout = buildTitleTextLayout(fixedWidthMeasurer(10), "a b c d e f g h i j k l m n o p q r s t", 50, 630, 0.2);
        expect(layout!.lines.length).toBeLessThanOrEqual(3);
    });

    it("is a pure function: identical inputs always produce identical layout", () => {
        const measurer = fixedWidthMeasurer(10);
        const a = buildTitleTextLayout(measurer, "Notes on FlowBus", 1200, 630, 0.2);
        const b = buildTitleTextLayout(measurer, "Notes on FlowBus", 1200, 630, 0.2);
        expect(a).toEqual(b);
    });
});

describe("renderTitleTextLayer", () => {
    it("returns an empty string for a null layout", () => {
        expect(renderTitleTextLayer(null)).toBe("");
    });

    it("renders the exact expected markup for a fixed, hand-built layout", () => {
        const layout = buildTitleTextLayout(fixedWidthMeasurer(10), "one two three four five six", 1200, 630, 0.2);
        expect(renderTitleTextLayer(layout)).toBe(
            '<rect x="30.0" y="269.5" width="322.0" height="86.4" rx="12" fill="#050506" opacity="0.36"/>' +
            '<text x="56.0" y="326.5" font-family="Inter" font-weight="800" font-size="46" fill="#ffffff" text-anchor="start" opacity="0.96">one two three four five six</text>',
        );
    });

    it("renders one <text> element per wrapped line, joined with no separator", () => {
        const layout = buildTitleTextLayout(fixedWidthMeasurer(30), "one two three four five six", 1200, 630, 0.2);
        const svg = renderTitleTextLayer(layout);
        expect((svg.match(/<text /g) ?? []).length).toBe(layout!.lines.length);
        // A `.match().length` count alone wouldn't notice an inserted
        // separator string between the two <text> elements.
        expect(svg).toContain("</text><text");
    });

    it("escapes XML-unsafe characters in the title text", () => {
        const layout = buildTitleTextLayout(fixedWidthMeasurer(10), "A&B <script>", 1200, 630, 0.2);
        const svg = renderTitleTextLayer(layout);
        expect(svg).toContain("A&amp;B &lt;script>");
        expect(svg).not.toContain("<script>");
    });
});
