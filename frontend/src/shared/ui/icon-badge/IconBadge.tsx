import type { ForwardedRef } from "react";
import * as React from "react";
import { cn } from "@/shared/lib/utils";
import type { IconBadgeProps, IconBadgeSize, IconBadgeTone } from "@/shared/ui/icon-badge/IconBadge.types.ts";

/**
 * IconBadge
 * ---------
 * Compact container for an icon used in cards, lists, and stats.
 *
 * - Background, border, and icon color are derived from semantic tokens.
 * - No box-shadow on hover by default to keep it lightweight; can be added
 *   by the parent if needed.
 */
export const IconBadge = React.forwardRef<HTMLDivElement, IconBadgeProps>(
    function IconBadge(
        { icon: Icon, tone = "default", size = "md", className, ...rest }: IconBadgeProps,
        ref: ForwardedRef<HTMLDivElement>,
    ) {
        const sizeClasses: Record<IconBadgeSize, string> = {
            sm: "p-xxs rounded-sm text-caption",
            md: "p-xs rounded-md text-body",
            lg: "p-sm rounded-lg text-body-lg",
        };

        const toneClasses: Record<IconBadgeTone, string> = {
            default: cn("bg-surface-raised", "border-border-default", "text-text-primary"),
            accent: cn("bg-surface-raised", "border-border-highlight", "text-accent-solid"),
            success: cn("bg-surface-raised", "border-border-default", "text-status-success"),
            warning: cn("bg-surface-raised", "border-border-default", "text-status-warning"),
            error: cn("bg-surface-raised", "border-border-default", "text-status-error"),
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center",
                    "border",
                    "transition-[background-color,border-color,transform]",
                    "duration-fast ease-entrance",
                    "group-hover:scale-press",
                    sizeClasses[size],
                    toneClasses[tone],
                    className,
                )}
                {...rest}
            >
                <Icon className="block" />
            </div>
        );
    },
);

IconBadge.displayName = "IconBadge";
