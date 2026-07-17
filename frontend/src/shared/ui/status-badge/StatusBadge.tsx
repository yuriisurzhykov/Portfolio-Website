import type { ForwardedRef, HTMLAttributes } from "react";
import * as React from "react";
import { cn } from "@/shared/lib/utils";

export type StatusTone = "success" | "warning" | "accent" | "neutral";

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
    tone?: StatusTone;
    /** Renders the small pulsing dot used by the "available" nav badge. */
    withDot?: boolean;
}

const toneClasses: Record<StatusTone, string> = {
    success: cn("text-status-success", "bg-status-success-tint-bg"),
    warning: cn("text-status-warning", "bg-status-warning-tint-bg"),
    accent: cn("text-accent-solid", "bg-accent-tint-bg"),
    neutral: cn("text-text-muted", "bg-surface-raised"),
};

const dotClasses: Record<StatusTone, string> = {
    success: "bg-status-success",
    warning: "bg-status-warning",
    accent: "bg-accent-solid",
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
