/**
 * The following file contains all project-related tokens, such as:
 * - colors;
 * - fonts;
 * - radii;
 * - shadows;
 * - z-indexes;
 *
 * All values are atomic. The typography itself is separated (see typography.ts).
 * */
export const colors = {
    // Basic neutral
    neutral: {
        0: "#0B0C0E",
        50: "#111317",
        100: "#151821",
        200: "#1B1F2A",
        300: "#23293A",
        400: "#2D3550",
        500: "#394265",
        600: "#47527D",
        700: "#5B699E",
        800: "#8C9AC5",
        900: "#C7D2FF",
    },
    // accent colors (cyber-neon, but muted)
    accent: {
        cyan: "#00E5FF",
        blue: "#4DA3FF",
        violet: "#9E7BFF",
    },
    // Semantic colors
    semantic: {
        success: "#2BC48A",
        warning: "#F0B429",
        danger: "#FF6B6B",
    },
};

export const surface = {
    base: "var(--neutral-100)",     // главный фон внутри карточек main background for all surfaces
    elevated: "var(--neutral-200)", // panels, card background
    highest: "var(--neutral-300)",  // more accent backgrounds
}

export const gradients = {
    accent: "linear-gradient(135deg, var(--accent-blue), var(--accent-violet))",
};

export const fonts = {
    body: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    mono: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
};

export const fontWeights = {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
};

export const radii = {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.25rem",
    xl: "1.5rem",
    pill: "9999px",
};

export const shadows = {
    soft: "0 4px 20px rgba(0,0,0,0.25)",
    hard: "0 8px 40px rgba(0,0,0,0.35)",
    low: "0 2px 10px rgba(0,0,0,0.25)",
    medium: "0 4px 20px rgba(0,0,0,0.3)",
    high: "0 8px 40px rgba(0,0,0,0.4)",
    glow: "0 0 20px rgba(77,163,255,0.5)",
};

export const spacing = {
    xs: "0.375rem",
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
    '2xl': "2rem",
    '3xl': "3rem",
};

export const opacity = {
    disabled: 0.4,
    muted: 0.7,
};

export const durations = {
    fast: "120ms",
    normal: "180ms",
    slow: "250ms",
};

export const easing = {
    standard: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    soft: "cubic-bezier(0.25, 0.8, 0.25, 1)",
};

export const zIndex = {
    header: 50,
    overlay: 100,
    modal: 200,
};

export const layout = {
    contentMaxWidth: "1160px",
    gridGap: spacing.lg,
};