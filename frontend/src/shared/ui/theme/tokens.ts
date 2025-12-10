/**
 * DESIGN TOKENS
 * ------------
 * Purpose: Provide a stable, reusable layer of abstraction above Tailwind and JSX.
 * */

/**
 * RAW PALETTE
 * -----------
 * Raw colors matching the JetBrains-style mockup.
 * */
export const palette = {
    // Base neutrals
    black: "#000000",          // Absolute page background
    neutral950: "#111113",     // Darkest strips/CTA sections
    neutral900: "#19191C",     // Primary card surface (The "JetBrains" grey)
    neutral800: "#2B2D30",     // Hover state / Lighter surface
    neutral700: "#393B40",     // Borders, inner separators
    neutral600: "#55595F",     // Intermediate strokes
    neutral500: "#6F7378",     // Muted text/icons
    neutral400: "#AFB1B3",     // Main secondary text
    neutral50: "#FFFFFF",      // White text

    // Accents (Aurora)
    accentMagenta: "#EF1C5C",  // Brand Magenta
    accentPurple: "#765AF8",   // Brand Purple
    accentBlue: "#3574F0",     // Bright Blue (Link/Info) - Updated to match mockup

    // Status
    successGreen: "#55C667",   // Vibrant Green
    warningYellow: "#E0A933",  // Warm Yellow
    errorRed: "#FF5C5C",       // Soft Red
};

/**
 * COLORS (SEMANTIC)
 * -----------------------------------------------------------------------------
 */
export const colors = {
    background: {
        app: palette.black,
        // The background for strips/dark blocks (CTA strip, tech ticker)
        strip: palette.neutral950,
    },

    surface: {
        // Main card surface (cards, hero code panel, nav bg).
        base: palette.neutral900,
        // Hover-elevation: card hover, icons, interactive blocks.
        raised: palette.neutral800,
    },

    border: {
        // Subtle divider (often same as surface, or slightly lighter)
        subtle: palette.neutral800,
        // Standard visible border for cards/inputs
        default: palette.neutral700,
        // Highlighting active/hover cards (Purple focus ring)
        highlight: "#6B57FF",
    },

    text: {
        // Main text (Headers, buttons)
        primary: palette.neutral50,
        // Secondary text (Descriptions, subheaders)
        secondary: palette.neutral400,
        // Muted text (Footer, labels, timestamps)
        muted: palette.neutral500,
        // Inverted text (On white buttons)
        inverse: palette.black,
    },

    accent: {
        // The main aurora gradient
        auroraText: `linear-gradient(135deg, ${palette.accentMagenta} 0%, ${palette.accentPurple} 100%)`,
        auroraFill: `linear-gradient(135deg, ${palette.accentMagenta} 0%, ${palette.accentPurple} 100%)`,
        // Solo accents
        magenta: palette.accentMagenta,
        purple: palette.accentPurple,
        blue: palette.accentBlue,
    },

    status: {
        success: palette.successGreen,
        warning: palette.warningYellow,
        error: palette.errorRed,
    },

    overlay: {
        scrim: "rgba(0,0,0,0.6)",
    },
};

/**
 * RADIUS
 * --------------------------------------------------------------------------------------------
 */
export const radii = {
    xs: "0.25rem",   // 4px
    sm: "0.5rem",    // 8px  (Small badges)
    md: "0.75rem",   // 12px (Standard internal elements)
    lg: "1rem",      // 16px (Cards)
    xl: "1.5rem",    // 24px (Large Containers/Modals) - Bumped to 24px
    pill: "9999px",  // Buttons
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
    "4xl": "4rem",   // 64px (Added for larger gaps)
};

/**
 * TYPOGRAPHY
 * ---------------------------------------------------------------------------------------------
 */
export const typography = {
    fontFamily: {
        body: "Inter, system-ui, sans-serif",
        mono: "'JetBrains Mono', monospace",
    },

    fontSize: {
        // Massive Hero Title ("Make it happen")
        hero: "6rem",     // ~72px (Tailwind 7xl)
        // Large Section Headers
        display: "3.75rem", // ~60px (Tailwind 6xl)
        // Standard H1
        h1: "3rem",         // ~48px (Tailwind 5xl)
        // Standard H2
        h2: "2.25rem",      // ~36px (Tailwind 4xl)
        // H3 / Large Card Titles
        h3: "1.5rem",       // ~24px (Tailwind 2xl)
        // Large Body / Lead
        bodyLg: "1.25rem",  // ~20px (Tailwind xl)
        // Standard Body
        body: "1rem",       // ~16px (Tailwind base)
        // Captions
        caption: "0.875rem", // ~14px (Tailwind sm)
        micro: "0.75rem",    // ~12px (Tailwind xs)
    },

    lineHeight: {
        tight: 1.1,
        normal: 1.5,
        relaxed: 1.625,
    },

    fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    },
};

/**
 * SHADOW
 * -----------------------------------------------------------------------------
 */
export const shadows = {
    // The specific white glow used on the Primary Button in the mockup
    primaryBtn: "0 0 20px rgba(255,255,255,0.3)",
    // Subtle inner glow for cards
    softGlow: "0 0 30px rgba(255,255,255,0.05)",
    // Deep shadow for floating elements
    surfaceDeep: "0 20px 40px rgba(0,0,0,0.6)",
    // Purple focus ring
    focusRing: "0 0 0 2px rgba(118, 90, 248, 0.5)",
};

/**
 * BLUR
 * -----------------------------------------------------------------------------
 */
export const blur = {
    auroraStrong: "120px",
    auroraSoft: "80px",
};

/**
 * MOTION
 * -----------------------------------------------------------------------------
 */
export const motion = {
    duration: {
        instant: 75,
        fast: 200,    // 200ms used in mockup
        normal: 300,  // 300ms used in mockup
        slow: 500,
    },
    easing: {
        standard: "cubic-bezier(0.25, 0.46, 0.45, 0.94)", // Quad-like ease out
        entrance: "cubic-bezier(0.3, 0.0, 0.2, 1)",
        exit: "cubic-bezier(0.4, 0.0, 0.6, 1)",
    },
    scale: {
        press: 0.95, // 0.95 active scale used in mockup
    }
};

export const layout = {
    contentMaxWidth: "80rem",      // 1280px
    contentMaxWidthWide: "90rem",  // 1440px
    sectionVerticalPadding: "6rem",
    navbarHeight: "5rem",
};

export const zIndex = {
    background: 0,
    content: 10,
    navbar: 40,
    snackbar: 50,
    overlay: 100,
};

export const tokens = {
    palette,
    color: colors,
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