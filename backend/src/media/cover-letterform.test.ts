import { describe, expect, it } from "vitest";
import {
    buildLetterformClip,
    LETTERFORM_FONT_FAMILY,
    LETTERFORM_FONT_SCALE,
    LETTERFORM_FONT_WEIGHT,
    LETTERFORM_OPACITY,
    LETTERFORM_OUTLINE_OPACITY,
    renderLetterformClipDef,
    renderLetterformLayer,
} from "./cover-letterform";

describe("buildLetterformClip", () => {
    it("pins the exact position/size formula: centered, font size = height * LETTERFORM_FONT_SCALE", () => {
        const clip = buildLetterformClip("FLOWBUS", 1200, 630, "clip-1");
        expect(clip.fontSize).toBeCloseTo(630 * LETTERFORM_FONT_SCALE);
        expect(clip.x).toBe(600);
        expect(clip.y).toBeCloseTo(630 * 0.58);
    });

    it("passes the word and clip id through unchanged", () => {
        const clip = buildLetterformClip("ARCHITECTURE", 1200, 630, "my-clip-id");
        expect(clip.word).toBe("ARCHITECTURE");
        expect(clip.clipId).toBe("my-clip-id");
    });
});

describe("renderLetterformClipDef", () => {
    it("renders the exact expected clipPath markup for a fixed clip", () => {
        const clip = buildLetterformClip("F", 1200, 630, "letterClip1");
        expect(renderLetterformClipDef(clip)).toBe(
            `<clipPath id="letterClip1"><text x="600.0" y="365.4" font-family="${ LETTERFORM_FONT_FAMILY }" font-weight="${ LETTERFORM_FONT_WEIGHT }" font-size="542" text-anchor="middle">F</text></clipPath>`,
        );
    });

    it("escapes XML-unsafe characters in the word", () => {
        const clip = buildLetterformClip("A&B<C", 1200, 630, "c1");
        expect(renderLetterformClipDef(clip)).toContain("A&amp;B&lt;C");
        expect(renderLetterformClipDef(clip)).not.toContain("A&B<C");
    });
});

describe("renderLetterformLayer", () => {
    it("wraps the fill markup in a group clipped to the letterform, at LETTERFORM_OPACITY", () => {
        const clip = buildLetterformClip("F", 1200, 630, "c1");
        const layer = renderLetterformLayer(clip, "<rect fill=\"red\"/>");
        expect(layer).toContain(`<g clip-path="url(#c1)" opacity="${ LETTERFORM_OPACITY }">`);
        expect(layer).toContain("<rect fill=\"red\"/>");
    });

    it("includes an unclipped outline of the same word after the clipped group", () => {
        const clip = buildLetterformClip("F", 1200, 630, "c1");
        const layer = renderLetterformLayer(clip, "<rect/>");
        const clippedGroupEnd = layer.indexOf("</g>") + "</g>".length;
        const outline = layer.slice(clippedGroupEnd);
        expect(outline).toContain("stroke=\"#ffffff\"");
        expect(outline).toContain(`opacity="${ LETTERFORM_OUTLINE_OPACITY }"`);
        expect(outline).not.toContain("clip-path");
    });

    it("never throws for an empty fill markup", () => {
        const clip = buildLetterformClip("F", 1200, 630, "c1");
        expect(() => renderLetterformLayer(clip, "")).not.toThrow();
    });
});
