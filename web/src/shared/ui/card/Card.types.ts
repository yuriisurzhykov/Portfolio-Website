import type { HTMLAttributes } from "react";

export type CardVariant = "filled" | "outlined" | "subtle";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Visual style of the card surface.
     *
     * - "filled"   – default surface background with subtle border
     * - "outlined" – transparent surface with stronger border
     * - "subtle"   – almost flat, used for nested content
     */
    variant?: CardVariant;

    /**
     * When true, card behaves like an interactive element:
     * - adds hover/focus states
     * - slightly scales on hover using motion tokens
     */
    interactive?: boolean;
}