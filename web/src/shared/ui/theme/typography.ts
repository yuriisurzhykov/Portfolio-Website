/**
 * Sizes/weights of fonts, vertical rhythm, semantic styles.
 * */
export type TextVariant =
    | "display"
    | "h1"
    | "h2"
    | "h3"
    | "lead"
    | "body"
    | "caption"
    | "muted"
    | "mono";

export const typography: Record<TextVariant, { fontSize: string; lineHeight: string; weightVar: string }>
    = {
    display: { fontSize: "clamp(2.5rem, 6vw, 4rem)", lineHeight: "1.1", weightVar: "var(--fw-extrabold)" },
    h1:      { fontSize: "clamp(2rem, 5vw, 3rem)",    lineHeight: "1.15", weightVar: "var(--fw-bold)" },
    h2:      { fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", lineHeight: "1.2", weightVar: "var(--fw-semibold)" },
    h3:      { fontSize: "1.25rem", lineHeight: "1.25", weightVar: "var(--fw-semibold)" },
    lead:    { fontSize: "1.125rem", lineHeight: "1.5", weightVar: "var(--fw-regular)" },
    body:    { fontSize: "1rem",     lineHeight: "1.6", weightVar: "var(--fw-regular)" },
    caption: { fontSize: "0.9rem",     lineHeight: "1.6", weightVar: "var(--fw-regular)" },
    muted:   { fontSize: "0.9375rem",lineHeight: "1.6", weightVar: "var(--fw-regular)" },
    mono:    { fontSize: "0.95rem",  lineHeight: "1.6", weightVar: "var(--fw-medium)" },
};