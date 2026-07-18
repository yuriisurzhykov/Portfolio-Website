import type { ForwardedRef } from "react";
import * as React from "react";
import { cn } from "@/shared/lib/utils";
import type { TagProps, TagSize, TagVariant } from "@/shared/ui/tag/Tag.types.ts";

/**
 * tag
 * ---
 * Small pill-like label used for skills, tech stack and filters.
 *
 * - No hover styles by default (keeps it cheap).
 * - Parent components can make it interactive when needed.
 */
export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
    function Tag(
        { variant = "neutral", size = "sm", className, ...rest }: TagProps,
        ref: ForwardedRef<HTMLSpanElement>,
    ) {
        const sizeClasses: Record<TagSize, string> = {
            sm: "px-sm py-xs font-mono text-micro rounded-sm",
            md: "px-md py-xs font-mono text-caption rounded-md",
        };

        const variantClasses: Record<TagVariant, string> = {
            // Solid surface chip — matches the landing "STACK" pill row.
            neutral: cn(
                "bg-surface-base",
                "text-text-chip",
                "border border-border-subtle",
            ),
            // Translucent chip — matches the hero's "shipped / in progress" badges.
            outline: cn(
                "bg-surface-raised",
                "text-text-chip",
                "border border-border-default",
            ),
            accent: cn(
                "bg-accent-tint-bg",
                "text-accent-text",
                "border border-transparent",
            ),
        };

        return (
            <span
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center",
                    "whitespace-nowrap",
                    sizeClasses[size],
                    variantClasses[variant],
                    className,
                )}
                {...rest}
            />
        );
    },
);

Tag.displayName = "Tag";
