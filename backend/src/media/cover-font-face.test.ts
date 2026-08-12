import { describe, expect, it } from "vitest";
import { renderFontFaceStyle } from "./cover-font-face";
import type { CoverFonts } from "./cover-fonts";

function fakeFonts(): CoverFonts {
    return {
        interBlack: Buffer.from("black-bytes"),
        interExtraBold: Buffer.from("extrabold-bytes"),
        jetBrainsMono: Buffer.from("mono-bytes"),
    };
}

describe("renderFontFaceStyle", () => {
    it("wraps everything in a single <style> element", () => {
        const style = renderFontFaceStyle(fakeFonts());
        expect(style.startsWith("<style>")).toBe(true);
        expect(style.endsWith("</style>")).toBe(true);
    });

    it("declares all three fonts, at their exact expected family/weight", () => {
        const style = renderFontFaceStyle(fakeFonts());
        expect(style).toContain('font-family:"Inter";font-weight:900;');
        expect(style).toContain('font-family:"Inter";font-weight:800;');
        expect(style).toContain('font-family:"JetBrains Mono";font-weight:500;');
    });

    it("joins the three @font-face rules back to back, with no separator between them", () => {
        // A `.toContain` check on each individual rule alone wouldn't
        // notice an inserted separator string between them (the rules
        // would still each individually be "contained").
        expect(renderFontFaceStyle(fakeFonts())).toContain("}@font-face{");
    });

    it("base64-encodes each font's actual bytes into its own data: URI", () => {
        const fonts = fakeFonts();
        const style = renderFontFaceStyle(fonts);
        expect(style).toContain(`data:font/ttf;base64,${ fonts.interBlack.toString("base64") }`);
        expect(style).toContain(`data:font/ttf;base64,${ fonts.interExtraBold.toString("base64") }`);
        expect(style).toContain(`data:font/ttf;base64,${ fonts.jetBrainsMono.toString("base64") }`);
    });

    it("is a pure function: identical fonts always produce identical output", () => {
        const fonts = fakeFonts();
        expect(renderFontFaceStyle(fonts)).toBe(renderFontFaceStyle(fonts));
    });

    it("produces different output for different font bytes (not accidentally reusing one buffer for all three)", () => {
        const style = renderFontFaceStyle(fakeFonts());
        const base64Occurrences = [
            Buffer.from("black-bytes").toString("base64"),
            Buffer.from("extrabold-bytes").toString("base64"),
            Buffer.from("mono-bytes").toString("base64"),
        ];
        expect(new Set(base64Occurrences).size).toBe(3);
        for (const encoded of base64Occurrences) {
            expect(style).toContain(encoded);
        }
    });
});
