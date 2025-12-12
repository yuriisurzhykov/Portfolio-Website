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
            sm: "px-xs py-2xs text-caption rounded-md",
            md: "px-sm py-2xs text-body rounded-lg",
        };

        const variantClasses: Record<TagVariant, string> = {
            neutral: cn(
                "bg-surface-subtle",
                "text-text-muted",
                "border border-border-subtle",
            ),
            outline: cn(
                "bg-transparent",
                "text-text-secondary",
                "border border-border-default",
            ),
            accent: cn(
                "bg-surface-raised",
                "text-accent-magenta",
                "border border-border-highlight",
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
