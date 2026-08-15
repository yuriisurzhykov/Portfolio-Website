import { definePrimitives } from "@portfolio/design-tokens";

/**
 * Carried over from the pre-migration `tokens.ts`'s `typography`, unreviewed — structure only for this pass
 * (see `composites/typography-styles.ts`). Sizes are role-shaped (`hero`/`display`/`h1`...), matching
 * `Text.tsx`'s own variant names one-to-one — a generic scale would be a regression here, not an improvement.
 * */
export const typography = definePrimitives({
    family: {
        body: "'Public Sans', system-ui, sans-serif",
        mono: "'JetBrains Mono', monospace",
    },
    weight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800,
    },
    size: {
        hero: "4rem",
        display: "3.25rem",
        h1: "2.75rem",
        h2: "1.5rem",
        h3: "1.25rem",
        bodyLg: "1.1875rem",
        body: "1rem",
        caption: "0.875rem",
        micro: "0.6875rem",
    },
    lineHeight: {
        tight: "1.1",
        normal: "1.5",
        relaxed: "1.65",
    },
});
