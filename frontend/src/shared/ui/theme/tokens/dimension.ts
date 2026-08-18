import { definePrimitives } from "@portfolio/design-tokens";

/** Carried over from the pre-migration `tokens.ts`'s `spacing`, unreviewed — structure only for this pass (see `semantic/spacing.ts`). */
export const dimension = definePrimitives({
    none: "0",
    xxs: "0.25rem",
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "2.5rem",
    "3xl": "3rem",
    "4xl": "4rem",
    "5xl": "5rem",
    "6xl": "6rem",
});
