import { describe, expect, it } from "vitest";
import { buildStampText, renderStampLayer, STAMP_FONT_FAMILY, STAMP_FONT_WEIGHT, STAMP_MARGIN, STAMP_OPACITY } from "./cover-stamp";

describe("buildStampText", () => {
    it("joins category / ref / date with the exact expected separator", () => {
        expect(buildStampText("Architecture", "7703", "08.26")).toBe("ARCHITECTURE / 7703 / 08.26");
    });

    it("uppercases the category but leaves ref/date untouched", () => {
        expect(buildStampText("android", "abcd", "01.26")).toBe("ANDROID / abcd / 01.26");
    });

    it("falls back to JOURNAL for an empty/blank category", () => {
        expect(buildStampText("", "7703", "08.26")).toBe("JOURNAL / 7703 / 08.26");
        expect(buildStampText("   ", "7703", "08.26")).toBe("JOURNAL / 7703 / 08.26");
    });

    it("trims surrounding whitespace from a real category before uppercasing", () => {
        expect(buildStampText("  Architecture  ", "7703", "08.26")).toBe("ARCHITECTURE / 7703 / 08.26");
    });
});

describe("renderStampLayer", () => {
    it("positions the text at the exact bottom-left margin", () => {
        const svg = renderStampLayer("Architecture", "7703", "08.26", 630);
        expect(svg).toContain(`x="${ STAMP_MARGIN }"`);
        expect(svg).toContain(`y="${ 630 - STAMP_MARGIN }"`);
    });

    it("renders the exact expected markup for a fixed input", () => {
        expect(renderStampLayer("Architecture", "7703", "08.26", 630)).toBe(
            `<text x="${ STAMP_MARGIN }" y="602" font-family="${ STAMP_FONT_FAMILY }" font-weight="${ STAMP_FONT_WEIGHT }" font-size="16" letter-spacing="2" fill="#f5f3f0" opacity="${ STAMP_OPACITY }" text-anchor="start">ARCHITECTURE / 7703 / 08.26</text>`,
        );
    });

    it("escapes XML-unsafe characters in the category", () => {
        const svg = renderStampLayer("A&B<C", "7703", "08.26", 630);
        expect(svg).toContain("A&amp;B&lt;C");
    });
});
