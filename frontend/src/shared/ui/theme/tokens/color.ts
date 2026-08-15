import { definePrimitives } from "@portfolio/design-tokens";

/**
 * Color primitives — physical values only, never exposed to Tailwind/app
 * directly (see `themes/`/`components/` for the layers that ARE). Ported
 * 1:1 from `ARCHITECTURE.md`'s section 3.1 — the one category that's had
 * the dedicated review (duplicate-check, hue-consistency audit, naming
 * pass) this whole architecture exists to enforce.
 *
 * Every value is a plain `hsl()` **string**, not a decomposed `{h,s,l}`
 * object — a string literal gets IDE-native color-swatch highlighting, an
 * object shape does not.
 */
export const color = definePrimitives({
    // NEUTRAL — single cool hue (219°). An earlier version of this design
    // mixed a cool dark-theme surface with warm dark-theme text — an
    // inconsistency in the original design export, not intentional. One
    // hue, both themes, fixes it.
    neutral: {
        0: "hsl(219 0% 100%)",
        20: "hsl(219 0% 96%)",
        50: "hsl(219 20% 91%)",
        100: "hsl(219 20% 82%)",
        200: "hsl(219 20% 73%)",
        300: "hsl(219 20% 64%)",
        400: "hsl(219 20% 55%)",
        500: "hsl(219 20% 46%)",
        600: "hsl(219 20% 37%)",
        700: "hsl(219 20% 28%)",
        800: "hsl(219 20% 19%)",
        900: "hsl(219 20% 10%)",
        950: "hsl(219 25% 5%)",
    },
    // BRAND — hue 20°, 500 = the real brand accent. (Originally miscomputed
    // as hue 45° by reading OKLCH's hue angle as if it were HSL's — the two
    // color spaces don't share a hue mapping. The real value, from a full
    // OKLCH→OKLab→linear-sRGB→sRGB→HSL conversion, is hue 20°.)
    brand: {
        50: "hsl(20 95% 96%)",
        100: "hsl(20 92% 91%)",
        200: "hsl(20 90% 83%)",
        300: "hsl(20 92% 74%)",
        400: "hsl(20 95% 66%)",
        500: "hsl(20 94% 61%)",
        600: "hsl(20 90% 52%)",
        700: "hsl(20 88% 43%)",
        800: "hsl(20 85% 33%)",
        900: "hsl(20 82% 22%)",
        950: "hsl(20 80% 13%)",
    },
    success: {
        50: "hsl(131 60% 96%)",
        100: "hsl(131 55% 90%)",
        200: "hsl(131 50% 82%)",
        300: "hsl(131 52% 75%)",
        400: "hsl(131 52% 71%)",
        500: "hsl(131 53% 67%)",
        600: "hsl(131 55% 56%)",
        700: "hsl(131 58% 44%)",
        800: "hsl(131 62% 32%)",
        900: "hsl(131 68% 21%)",
        950: "hsl(131 72% 12%)",
    },
    warning: {
        50: "hsl(37 75% 96%)",
        100: "hsl(37 72% 90%)",
        200: "hsl(37 70% 82%)",
        300: "hsl(37 72% 74%)",
        400: "hsl(37 74% 69%)",
        500: "hsl(37 75% 64%)",
        600: "hsl(37 78% 54%)",
        700: "hsl(37 80% 42%)",
        800: "hsl(37 82% 30%)",
        900: "hsl(37 85% 20%)",
        950: "hsl(37 88% 12%)",
    },
    // DANGER — entirely new; the pre-migration design had no distinct
    // danger color, status-error was aliased to warning.
    danger: {
        50: "hsl(0 85% 97%)",
        100: "hsl(0 82% 92%)",
        200: "hsl(0 80% 85%)",
        300: "hsl(0 78% 76%)",
        400: "hsl(0 76% 68%)",
        500: "hsl(0 74% 60%)",
        600: "hsl(0 70% 50%)",
        700: "hsl(0 68% 42%)",
        800: "hsl(0 65% 32%)",
        900: "hsl(0 62% 22%)",
        950: "hsl(0 60% 12%)",
    },
    // Theme-invariant decorative/syntax hues — used directly by component
    // tokens (see components/code-block.ts, components/skill-card.ts),
    // never through the theme axis: the original design never varied these
    // by theme either (e.g. CodeBlock's syntax highlighting is the same
    // palette on both site themes).
    accent: {
        purple: "hsl(255 100% 82%)",
        blue: "hsl(211 100% 74%)",
        magenta: "hsl(316 55% 52%)"
    },
    // OVERLAY — alpha only, NOT a color scale: one step number is the same
    // visual intensity over either base; the THEME picks the base, never
    // the intensity.
    overlayWhite: {
        4: "hsl(0 0% 100% / 4%)",
        8: "hsl(0 0% 100% / 8%)",
        12: "hsl(0 0% 100% / 12%)",
        16: "hsl(0 0% 100% / 16%)",
        20: "hsl(0 0% 100% / 20%)",
        24: "hsl(0 0% 100% / 24%)",
        32: "hsl(0 0% 100% / 32%)",
        48: "hsl(0 0% 100% / 48%)",
    },
    overlayBlack: {
        4: "hsl(0 0% 0% / 4%)",
        8: "hsl(0 0% 0% / 8%)",
        12: "hsl(0 0% 0% / 12%)",
        16: "hsl(0 0% 0% / 16%)",
        20: "hsl(0 0% 0% / 20%)",
        24: "hsl(0 0% 0% / 24%)",
        32: "hsl(0 0% 0% / 32%)",
        48: "hsl(0 0% 0% / 48%)",
    },
    // SCRIM — composited against each theme's OWN primary hue, not plain
    // white/black like overlay above — that's why it's a separate category.
    scrim: {
        dark: "hsl(219 25% 5% / 85%)",
        light: "hsl(219 0% 100% / 85%)"
    },
    // PATTERN — a decorative two-tone hatch for one placeholder-cover
    // illustration. Per-theme (a dark hatch on a light cover would look
    // broken); deliberately not part of the neutral scale.
    pattern: {
        darkPrimary: "hsl(219 15% 10%)",
        darkSecondary: "hsl(219 15% 8%)",
        lightPrimary: "hsl(219 20% 91%)",
        lightSecondary: "hsl(219 15% 96%)",
    },
});
