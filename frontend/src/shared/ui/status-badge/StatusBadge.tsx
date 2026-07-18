import type { ForwardedRef, HTMLAttributes } from "react";
import * as React from "react";
import { cn } from "@/shared/lib/utils";

export type StatusTone = "success" | "warning" | "accent" | "neutral";

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
    tone?: StatusTone;
    /** Renders the small pulsing dot used by the "available" nav badge. */
    withDot?: boolean;
}

// Solid fill + dark "ink" text/dot, not the earlier pale-tint + colored-text pill: the tint
// version failed WCAG AA contrast on the light theme (colored text too close in luminance to a
// near-white tint background — see VISUAL_TESTING_GUIDE.md, section 11). Dark ink on top of these
// (light/pastel) brand colors clears AA with a large margin in both themes, so this one style
// works everywhere instead of needing a per-theme exception.
const toneClasses: Record<StatusTone, string> = {
    success: cn("text-status-on-solid", "bg-status-success"),
    warning: cn("text-status-on-solid", "bg-status-warning"),
    accent: cn("text-accent-on-solid", "bg-accent-solid"),
    neutral: cn("text-text-muted", "bg-surface-raised"),
};

const dotClasses: Record<StatusTone, string> = {
    success: "bg-status-on-solid",
    warning: "bg-status-on-solid",
    accent: "bg-accent-on-solid",
    neutral: "bg-text-muted",
};

/**
 * StatusBadge
 * -----------
 * Small pill used for project status ("SHIPPED" / "IN PROGRESS"), the nav
 * availability indicator, and journal category tags — every colored pill
 * in the approved design shares this exact shape (rounded-full, mono,
 * tinted background matching the text color).
 */
export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
    function StatusBadge(
        { tone = "neutral", withDot = false, className, children, ...rest }: StatusBadgeProps,
        ref: ForwardedRef<HTMLSpanElement>,
    ) {
        return (
            <span
                ref={ref}
                className={cn(
                    "inline-flex items-center gap-xs",
                    "rounded-pill font-mono font-semibold text-micro uppercase tracking-wide",
                    withDot ? "py-xs pl-xs pr-sm" : "px-sm py-xs",
                    toneClasses[tone],
                    className,
                )}
                {...rest}
            >
                {withDot && (
                    <span className={cn("h-1.5 w-1.5 rounded-full inline-block", dotClasses[tone])} />
                )}
                {children}
            </span>
        );
    },
);

StatusBadge.displayName = "StatusBadge";
