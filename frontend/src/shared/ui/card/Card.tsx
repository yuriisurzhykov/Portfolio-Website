import type { ForwardedRef } from "react";
import * as React from "react";
import { cn } from "@/shared/lib/utils";
import type { CardProps } from "@/shared/ui/card/Card.types";

/**
 * card
 * ----
 * Base surface component used across the design system.
 *
 * Performance notes:
 * - Single DOM node, no extra wrappers.
 * - Hover/focus handled purely via CSS transitions.
 * - Uses transform-based scale for interaction (GPU friendly).
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    function Card(
        { variant = "filled", interactive = false, className, ...rest }: CardProps,
        ref: ForwardedRef<HTMLDivElement>,
    ) {
        const variantClasses = {
            filled: cn(
                "bg-surface-base",          // surface token
                "border", "border-border-subtle",
            ),
            outlined: cn(
                "bg-transparent",
                "border", "border-border-default",
            ),
            subtle: cn(
                "bg-surface-subtle",
                "border", "border-border-subtle",
            ),
        }[variant];

        const interactiveClasses = interactive
            ? cn(
                "cursor-pointer",
                "transition-background-color duration-normal ease-standard",
                "transition-border-color duration-normal ease-standard",
                "transition-box-shadow duration-normal ease-standard",
                "transition-transform duration-normal ease-standard",
                "hover:bg-surface-raised",
                "hover:border-border-highlight",
                "hover:shadow-soft-lg",
                "hover:scale-press",
                "focus-visible:outline-none",
                "focus-visible:shadow-focus-ring",
            )
            : "";

        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-xl", // maps to radius token
                    "text-text-primary",
                    variantClasses,
                    interactiveClasses,
                    className,
                )}
                {...rest}
            />
        );
    },
);

Card.displayName = "Card";
