import { definePrimitives } from "@portfolio/design-tokens";

/** Carried over from the pre-migration `tokens.ts`'s `radii`, unreviewed — structure only for this pass (see `semantic/radius.ts`). */
export const radius = definePrimitives({
    xs: "0.25rem",
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.625rem",
    xl: "0.75rem",
    "2xl": "1rem",
    pill: "9999px",
});
