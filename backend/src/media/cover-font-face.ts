import type { CoverFonts } from "./cover-fonts";

/**
 * Builds the `<style>@font-face{...}</style>` block that makes an embedded
 * TTF actually render as `font-family: "Inter"` (etc.) inside the SVG —
 * split out from `cover-fonts.ts` (which only reads bytes off disk) so this
 * pure string-building step has its own unit test with no file I/O
 * involved. Confirmed live (Day-0 gate): librsvg renders a base64 `data:`
 * URI `@font-face` src correctly, including for a `<text>` used as a
 * `<clipPath>`'s content.
 */
const FONT_FACE_DECLARATIONS: ReadonlyArray<{ family: string; weight: number; fontsKey: keyof CoverFonts }> = [
    { family: "Inter", weight: 900, fontsKey: "interBlack" },
    { family: "Inter", weight: 800, fontsKey: "interExtraBold" },
    { family: "JetBrains Mono", weight: 500, fontsKey: "jetBrainsMono" },
];

export function renderFontFaceStyle(fonts: CoverFonts): string {
    const rules = FONT_FACE_DECLARATIONS.map(({ family, weight, fontsKey }) => {
        const base64 = fonts[fontsKey].toString("base64");
        return `@font-face{font-family:"${ family }";font-weight:${ weight };src:url(data:font/ttf;base64,${ base64 }) format("truetype");}`;
    }).join("");
    return `<style>${ rules }</style>`;
}
