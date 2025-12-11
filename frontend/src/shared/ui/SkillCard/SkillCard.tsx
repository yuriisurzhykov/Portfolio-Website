import type { ForwardedRef } from "react";
import * as React from "react";

import type { SkillCardProps, SkillCardTone, SkillCardVariant } from "./SkillCard.types";
import { cn } from "@/shared/lib";

/**
 * Mapping from `variant` to surface / border / spacing styles.
 *
 * Each entry only uses Tailwind utilities backed by design tokens from
 * tokens.ts + theme.css.ts + index.css (colors, radius, spacing, motion).
 */
const VARIANT_STYLES: Record<SkillCardVariant, string> = {
    default: cn(
        "p-lg",                        // spacing.lg
        "bg-surface-base",
        "border",
        "border-border-subtle",
        "hover:bg-surface-raised",
    ),
    outlined: cn(
        "p-lg",
        "bg-transparent",
        "border",
        "border-border-default",
        "hover:bg-surface-base",
    ),
    subtle: cn(
        "p-md",
        "bg-transparent",
        "border",
        "border-transparent",
        "hover:bg-surface-base",
    ),
    accent: cn(
        "p-lg",
        "bg-surface-base",
        "border",
        "border-border-highlight",
        "shadow-soft-glow",
        "hover:bg-surface-raised",
        "hover:shadow-surface-deep",
    ),
};

/**
 * Mapping from `tone` to icon / micro-accent color.
 * Uses semantic accent + status tokens.
 */
const TONE_ICON_COLOR: Record<SkillCardTone, string> = {
    default: "text-text-primary",
    accent: "text-accent-purple",
    success: "text-status-success",
    warning: "text-status-warning",
    error: "text-status-error",
};

/**
 * SkillCard
 * ---------
 *
 * A composable, token-driven card for showcasing skills/technologies.
 *
 * Design goals:
 * - Uses ONLY design tokens wired via index.css / theme.css.ts (colors, radius,
 *   spacing, typography, motion), no raw hex / px values.
 * - ForwardRef-compatible: can be measured / focused from parent components.
 * - Hover / focus states rely on semantic surface / border / shadow tokens.
 * - Variants & tones are additive and can be extended without breaking API.
 */
export const SkillCard = React.forwardRef<HTMLDivElement, SkillCardProps>(
    function SkillCard(
        {
            icon: Icon,
            title,
            desc,
            variant = "default",
            tone = "default",
            className,
            ...rest
        }: SkillCardProps,
        ref: ForwardedRef<HTMLDivElement>,
    ) {
        const iconToneClass = TONE_ICON_COLOR[tone];

        return (
            <div
                ref={ref}
                className={cn(
                    // Layout
                    "group relative flex flex-col gap-sm",
                    // Surface / border / spacing – driven by variant
                    VARIANT_STYLES[variant],
                    // Radius & typography defaults
                    "rounded-xl", // radius.xl
                    // Text defaults
                    "text-text-primary",
                    // Motion
                    "transition-[background-color,border-color,box-shadow,transform]",
                    "duration-normal",
                    "ease-standard",
                    // Interaction
                    "cursor-default",
                    "focus-visible:outline-none focus-visible:shadow-focus-ring",
                    className,
                )}
                {...rest}
            >
                {/* Icon */}
                {Icon && (
                    <div
                        className={cn(
                            "w-12 h-12 flex items-center justify-center",
                            "rounded-md",
                            "border border-border-default",
                            "bg-surface-base",
                            "shadow-soft-glow",
                            "transition-[background-color,border-color,box-shadow,transform]",
                            "duration-fast",
                            "ease-entrance",
                            "group-hover:bg-surface-raised",
                            "group-hover:border-border-highlight",
                            "group-hover:shadow-surface-deep",
                        )}
                    >
                        <Icon
                            className={cn(
                                "w-xl",
                                "h-xl",
                                "block",
                                iconToneClass,
                            )}
                        />
                    </div>
                )}

                {/* Title */}
                <h3
                    className={cn(
                        "mt-sm",
                        "text-h3",
                        "leading-tight",
                        "font-semibold",
                        "text-text-primary",
                    )}
                >
                    {title}
                </h3>

                {/* Description */}
                <p
                    className={cn(
                        "mt-xs",
                        "text-body",
                        "leading-relaxed",
                        "text-text-secondary",
                    )}
                >
                    {desc}
                </p>
            </div>
        );
    },
);

SkillCard.displayName = "SkillCard";
