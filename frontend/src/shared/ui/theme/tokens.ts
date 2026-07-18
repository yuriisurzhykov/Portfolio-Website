/**
 * DESIGN TOKENS
 * ------------
 * Purpose: Provide a stable, reusable layer of abstraction above Tailwind and JSX.
 * Values below are ported 1:1 from the approved Claude Design export, which
 * ships both a dark and a light theme driven by the same set of CSS custom
 * properties (see uploads/*.dc.html — `--bg`, `--card`, `--text`, ...).
 * */

/**
 * INVARIANT PALETTE
 * -----------------
 * Colors that are identical in both themes: the single brand accent, status
 * colors, and the code-syntax palette. The approved design never varies
 * these by theme — e.g. "SHIPPED" is the same green whether the page is
 * light or dark.
 * */
export const palette = {
    accent: "oklch(0.72 0.17 45)",
    accentHover: "oklch(0.78 0.17 45)",
    accentTintRgb: "232,116,58",          // rgba() base for accent-tinted chips/badges

    statusGreen: "#7fd88f",     // Shipped / Available
    statusGreenTintRgb: "127,216,143",
    statusAmber: "#e8b45e",     // In progress
    statusAmberTintRgb: "232,180,94",

    codeAccent: "oklch(0.72 0.17 45)",
    codeStatusGreen: "#7fd88f",
    codeStatusAmber: "#e8b45e",

    // Extra hues used only for code syntax highlighting variety
    syntaxPurple: "#b8a1ff",
    syntaxBlue: "#7ab8ff",

    // Code panels (CodeBlock) are always dark, regardless of site theme —
    // matches the approved design, where the FlowBus.kt sample keeps its
    // dark "terminal" look on both the light and dark page.
    codePanelBg: "#111113",
    codePanelBorder: "rgba(255,255,255,.08)",
    codePanelHoverBg: "rgba(255,255,255,.06)",
    codePanelTitle: "#8a877f",
    codePanelCopyText: "#b3b0ab",
    codePanelCopyTextHover: "#f5f3f0",
    codePanelCode: "#d8d4cd",
    codePanelLineNumber: "#8a877f",
};

/**
 * NEUTRAL PALETTE — DARK
 * ----------------------
 * `--bg` / `--card` / `--border` / ... from the approved export's dark
 * variant.
 * */
export const darkPalette = {
    bg: "#0b0b0d",
    card: "#111113",
    border: "rgba(255,255,255,.08)",
    borderStrong: "rgba(255,255,255,.22)",
    nav: "rgba(11,11,13,.85)",
    text: "#f5f3f0",
    text2: "#b3b0ab",
    muted: "#8a877f",
    // WCAG AA fix: the original #57544d only hit a ~2.6:1 contrast ratio against `bg`/`card`
    // (needs >=4.5:1 for normal-size text) — see README.md section 11. Lightened
    // while keeping the same warm-gray hue; now ~6:1 against `bg` and ~5.3:1 even against the
    // lightest nested surface (`tagBg` composited over `card`).
    dim: "#938e83",
    // Same values as the (now code-only) invariant palette above — dark theme's UI accent/status
    // colors are unchanged from the original approved design; only light theme needed a darker
    // variant (see lightPalette below).
    accent: palette.codeAccent,
    // Color for accent-colored INLINE TEXT with no background to lean on (links, Eyebrow,
    // WorkDetailPage step titles) — see lightPalette.accentText for why this differs by theme.
    // Dark theme: same vibrant orange as `accent`, already passes AA against the near-black page.
    accentText: palette.codeAccent,
    statusGreen: palette.codeStatusGreen,
    statusAmber: palette.codeStatusAmber,
    tagBg: "rgba(255,255,255,.04)",
    tagBorder: "rgba(255,255,255,.12)",
    chip: "#d8d4cd",
    surfaceIcon: "rgba(255,255,255,.06)",
    rowHover: "rgba(255,255,255,.03)",
    connector: "rgba(255,255,255,.15)",
    hatchA: "#1a1a1d",
    hatchB: "#161618",
    glowA: "oklch(0.65 0.19 45)",
    glowB: "oklch(0.65 0.19 300)",
    glowOpacity: "0.32",
};

/**
 * NEUTRAL PALETTE — LIGHT
 * -----------------------
 * `--bg` / `--card` / `--border` / ... from the approved export's light
 * variant.
 * */
export const lightPalette = {
    bg: "#f7f5f0",
    card: "#ffffff",
    border: "rgba(0,0,0,.1)",
    borderStrong: "rgba(0,0,0,.22)",
    nav: "rgba(247,245,240,.85)",
    text: "#181614",
    text2: "#4a4744",
    muted: "#6b6862",
    // WCAG AA fix: the original #948f86 only hit a ~3.0:1 contrast ratio against `bg` (needs
    // >=4.5:1) — see README.md section 11. Darkened while keeping the same
    // warm-gray hue; now ~5.2:1 against `bg` (and higher still against the white `card` surface).
    dim: "#6b6760",
    // REVERTED: an earlier version of this fix darkened these to #ab5327/#40724a/#806230 to
    // satisfy WCAG AA contrast on this theme's near-white background (see the color-contrast
    // findings logged in README.md, section 11) — but the result looked muddy/wrong
    // and was rejected on visual grounds. Reverted to the original vibrant brand colors (same as
    // dark theme) until a fix that's both accessible AND visually acceptable is agreed on. The 6
    // related axe violations are intentionally left failing for now — see section 11.
    accent: palette.codeAccent,
    // WCAG AA fix: `accent`/`accentText` are otherwise the same value, but this role has no
    // solid/tint background to lean on (plain inline links, Eyebrow labels, step titles directly
    // on the page/card background) — the button/badge fix (dark ink ON TOP of a vibrant solid
    // fill) doesn't apply here, there's simply no fill to put dark text on. Darkened to the same
    // hue family; ratio ~4.7-5.7 against every background this text actually appears on (page bg,
    // white cards, the accent tint). See README.md, section 11, for the numbers and
    // the two rejected alternatives (global darken, "onSolid"-style token) that came before this.
    accentText: "#be3500",
    statusGreen: palette.codeStatusGreen,
    statusAmber: palette.codeStatusAmber,
    tagBg: "#ffffff",
    tagBorder: "rgba(0,0,0,.1)",
    chip: "#3a3733",
    surfaceIcon: "rgba(0,0,0,.05)",
    rowHover: "rgba(0,0,0,.03)",
    connector: "rgba(0,0,0,.14)",
    hatchA: "#efece5",
    hatchB: "#f7f5f0",
    glowA: "oklch(0.8 0.13 45)",
    glowB: "oklch(0.8 0.09 300)",
    glowOpacity: "0.22",
};

/**
 * COLORS (SEMANTIC) — one builder shared by both themes
 * -----------------------------------------------------------------------------
 */
function buildColors(neutral: typeof darkPalette) {
    return {
        background: {
            app: neutral.bg,
            strip: neutral.card,
        },

        surface: {
            base: neutral.card,
            raised: neutral.tagBg,
            icon: neutral.surfaceIcon,
            rowHover: neutral.rowHover,
            placeholderA: neutral.hatchA,
            placeholderB: neutral.hatchB,
        },

        border: {
            subtle: neutral.border,
            default: neutral.tagBorder,
            strong: neutral.borderStrong,
            connector: neutral.connector,
            highlight: neutral.accent,
        },

        text: {
            primary: neutral.text,
            secondary: neutral.text2,
            muted: neutral.muted,
            faint: neutral.dim,
            chip: neutral.chip,
            inverse: neutral.bg,
        },

        accent: {
            solid: neutral.accent,
            solidHover: palette.accentHover,
            // Text drawn ON TOP of `accent.solid` (buttons, solid-fill badges) — deliberately
            // NOT a lighter/darker shade of the accent itself (that path is what produced the
            // rejected "muddy" fix, see README.md section 11). Instead reuses the
            // site's own near-black dark-theme background as an "ink" color: ~7.5:1 contrast
            // against the vibrant orange in both themes, and the accent itself stays untouched.
            onSolid: darkPalette.bg,
            text: neutral.accentText,
            glow: `radial-gradient(circle at 30% 30%, ${ neutral.glowA } 0%, ${ neutral.glowB } 55%, transparent 75%)`,
            glowOpacity: neutral.glowOpacity,
            tintBg: `rgba(${ palette.accentTintRgb },.12)`,
        },

        status: {
            success: neutral.statusGreen,
            successTintBg: `rgba(${ palette.statusGreenTintRgb },.12)`,
            warning: neutral.statusAmber,
            warningTintBg: `rgba(${ palette.statusAmberTintRgb },.12)`,
            // No distinct danger color in the approved design; alias to warning.
            error: neutral.statusAmber,
            // Same value/rationale as accent.onSolid above — text/dot drawn on top of a solid
            // status-success/warning fill (StatusBadge). Both statusGreen and statusAmber are
            // light/pastel enough that dark ink clears WCAG AA with a huge margin (~10-11:1) in
            // both themes, which is what let StatusBadge move from "pale tint + colored text"
            // (failed AA on light theme) to "solid fill + dark text" (passes everywhere).
            onSolid: darkPalette.bg,
        },

        // Prism/CodeBlock syntax-highlighting palette — theme-invariant (always the vibrant
        // original values): the code panel itself is always dark regardless of site theme (see
        // `palette.codePanel*`), so these deliberately do NOT use the theme-specific
        // `neutral.accent`/`neutral.statusGreen`/`neutral.statusAmber` from above.
        code: {
            keyword: palette.codeAccent,
            string: palette.codeStatusGreen,
            number: palette.codeStatusAmber,
            className: palette.syntaxPurple,
            function: palette.syntaxBlue,
            property: palette.syntaxBlue,
            punctuation: darkPalette.text2,
            comment: darkPalette.muted,
        },

        codePanel: {
            bg: palette.codePanelBg,
            border: palette.codePanelBorder,
            hoverBg: palette.codePanelHoverBg,
            title: palette.codePanelTitle,
            copyText: palette.codePanelCopyText,
            copyTextHover: palette.codePanelCopyTextHover,
            code: palette.codePanelCode,
            lineNumber: palette.codePanelLineNumber,
        },

        overlay: {
            scrim: neutral.nav,
        },
    };
}

export const colors = buildColors(darkPalette);
export const colorsLight = buildColors(lightPalette);

/**
 * RADIUS
 * --------------------------------------------------------------------------------------------
 */
export const radii = {
    xs: "0.25rem",   // 4px
    sm: "0.375rem",  // 6px  (stack chips)
    md: "0.5rem",    // 8px  (buttons, badges)
    lg: "0.625rem",  // 10px (principle cards)
    xl: "0.75rem",   // 12px (work cards)
    "2xl": "1rem",   // 16px (contact CTA panel)
    pill: "9999px",  // status pills
};

/**
 * SPACING
 * -------------
 */
export const spacing = {
    none: "0",
    xxs: "0.25rem",  // 4px
    xs: "0.5rem",    // 8px
    sm: "0.75rem",   // 12px
    md: "1rem",      // 16px
    lg: "1.5rem",    // 24px
    xl: "2rem",      // 32px
    "2xl": "2.5rem", // 40px
    "3xl": "3rem",   // 48px
    "4xl": "4rem",   // 64px
};

/**
 * TYPOGRAPHY
 * ---------------------------------------------------------------------------------------------
 */
export const typography = {
    fontFamily: {
        body: "'Public Sans', system-ui, sans-serif",
        mono: "'JetBrains Mono', monospace",
    },

    fontSize: {
        hero: "4rem",         // 64px — landing name (fluid via clamp in component)
        display: "3.25rem",   // 52px — All Work / case-study H1
        h1: "2.75rem",        // 44px — Journal / Blog Post H1
        h2: "1.5rem",         // 24px — in-article section headers
        h3: "1.25rem",        // 20px — card / ledger titles
        bodyLg: "1.1875rem",  // 19px — hero lead, blog intro paragraph
        body: "1rem",         // 16px
        caption: "0.875rem",  // 14px
        micro: "0.6875rem",   // 11px — eyebrow labels (STACK, ALL WORK, ...)
    },

    lineHeight: {
        tight: 1.1,
        normal: 1.5,
        relaxed: 1.65,
    },

    fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800,
    },
};

/**
 * SHADOW
 * -----------------------------------------------------------------------------
 */
export const shadows = {
    primaryBtn: "none",
    softGlow: "none",
    surfaceDeep: "0 20px 40px rgba(0,0,0,0.6)",
    // NOTE: not theme-aware (this object is built once, not per-theme like `colors`/
    // `colorsLight`) — kept at the original invariant accent value. Focus-ring contrast against
    // the light theme's background isn't covered by this task's axe scan (focus states aren't
    // part of the static DOM), but would be worth revisiting if light theme becomes public.
    focusRing: `0 0 0 2px ${ darkPalette.accent }`,
};

/**
 * BLUR
 * -----------------------------------------------------------------------------
 */
export const blur = {
    auroraStrong: "80px",
    auroraSoft: "70px",
};

/**
 * MOTION
 * -----------------------------------------------------------------------------
 */
export const motion = {
    duration: {
        instant: 75,
        fast: 150,
        normal: 200,
        slow: 300,
    },
    easing: {
        standard: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        entrance: "cubic-bezier(0.3, 0.0, 0.2, 1)",
        exit: "cubic-bezier(0.4, 0.0, 0.6, 1)",
    },
    scale: {
        press: 0.97,
    }
};

export const layout = {
    contentMaxWidth: "80rem",       // 1280px
    contentMaxWidthWide: "90rem",   // 1440px  (unused by this design, kept for future pages)
    contentNarrow: "68.75rem",      // 1100px  (All Work ledger)
    contentReading: "47.5rem",      // 760px   (Blog Post)
    contentJournal: "51.25rem",     // 820px   (All Journal)
    sectionVerticalPadding: "6rem",
    navbarHeight: "5rem",
};

export const zIndex = {
    background: 0,
    content: 10,
    navbar: 20,
    snackbar: 50,
    overlay: 100,
};

export const tokens = {
    palette,
    darkPalette,
    lightPalette,
    color: colors,
    colorLight: colorsLight,
    radius: radii,
    spacing,
    typography,
    shadows,
    blur,
    motion,
    layout,
    zIndex,
};

export type DesignTokens = typeof tokens;
