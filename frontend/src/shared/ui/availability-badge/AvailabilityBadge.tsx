import type { ForwardedRef, HTMLAttributes } from "react";
import * as React from "react";
import { cn } from "@/shared/lib/utils";

export type AvailabilityTone = "available" | "engaged" | "limited";

export interface AvailabilityBadgeProps extends HTMLAttributes<HTMLSpanElement> {
    tone?: AvailabilityTone;
    /** Renders the small pulsing dot used by the "available" nav badge. */
    withDot?: boolean;
}

type ColorIndicators = {
    background: string;
    foreground: string;
};

// Solid fill + dark "ink" text/dot, not the earlier pale-tint + colored-text pill: the tint
// version failed WCAG AA contrast on the light theme (colored text too close in luminance to a
// near-white tint background — see README.md, section 11). Dark ink on top of these
// (light/pastel) brand colors clears AA with a large margin in both themes, so this one style
// works everywhere instead of needing a per-theme exception.
const toneClasses: Record<AvailabilityTone, string> = {
    available: cn("text-status-on-solid", "bg-status-success"),
    engaged: cn("text-status-on-solid", "bg-status-warning"),
    limited: cn("text-text-muted", "bg-surface-raised"),
};

const dotClasses: Record<AvailabilityTone, ColorIndicators> = {
    available: {
        foreground: "text-status-on-solid",
        background: "bg-status-on-solid",
    },
    engaged: {
        foreground: "text-status-on-solid",
        background: "bg-status-on-solid",
    },
    limited: {
        foreground: "text-status-on-solid",
        background: "bg-status-error",
    },
};

/**
 * StatusBadge
 * -----------
 * Small pill used for project status ("SHIPPED" / "IN PROGRESS"), the nav
 * availability indicator, and journal category tags — every colored pill
 * in the approved design shares this exact shape (rounded-full, mono,
 * tinted background matching the text color).
 */
export const AvailabilityBadge = React.forwardRef<HTMLSpanElement, AvailabilityBadgeProps>(
    function AvailabilityBadge(
        {tone = "available", withDot = false, className, children, ...rest}: AvailabilityBadgeProps,
        ref: ForwardedRef<HTMLSpanElement>,
    ) {
        return (
            <span
                ref={ ref }
                className={ cn(
                    "inline-flex items-center gap-xs",
                    "rounded-pill font-mono font-semibold text-micro uppercase tracking-wide",
                    withDot ? "py-xs pl-xs pr-sm" : "px-sm py-xs",
                    toneClasses[tone],
                    className,
                ) }
                { ...rest }
            >
                <div className="flex items-center justify-center">
                    <span className="relative flex h-2 w-2">
                        <span
                            className={
                                cn("animate-ping",
                                    "absolute",
                                    "inline-flex",
                                    "h-full w-full",
                                    "rounded-full " +
                                    "opacity-75",
                                    dotClasses[tone].background)
                            }></span>
                        <span
                            className={ cn("relative inline-flex rounded-full h-2 w-2", dotClasses[tone].background) }></span>
                    </span>
                </div>
                { children }
            </span>
        );
    },
);

AvailabilityBadge.displayName = "AvailabilityBadge";
