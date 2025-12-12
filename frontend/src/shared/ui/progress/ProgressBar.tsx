import type { ForwardedRef, HTMLAttributes } from "react";
import * as React from "react";
import { cn } from "@/shared/lib/utils";

export type ProgressVariant = "accent" | "neutral" | "accent-inverse";

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Value between 0 and 1. Out-of-range values are clamped.
     */
    value: number;

    variant?: ProgressVariant;
}

/**
 * ProgressBar
 * -----------
 * Thin, animated progress indicator.
 *
 * - Uses a simple transform-free width animation (only CSS, no JS timers).
 * - Track/indicator styles map to semantic surface/accent tokens.
 */
export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
    function ProgressBar(
        { value, variant = "accent", className, ...rest }: ProgressBarProps,
        ref: ForwardedRef<HTMLDivElement>,
    ) {
        const clamped = Number.isFinite(value)
            ? Math.max(0, Math.min(1, value))
            : 0;

        const indicatorVariantClasses: Record<ProgressVariant, string> = {
            neutral: "bg-border-default",
            accent: "bg-accent-magenta",
            "accent-inverse": "bg-accent-blue",
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "w-full rounded-full bg-surface-subtle overflow-hidden",
                    "h-[var(--progress-thickness,0.25rem)]", // thickness via token fallback
                    className,
                )}
                {...rest}
            >
                <div
                    className={cn(
                        "h-full rounded-full",
                        "transition-[width] duration-normal ease-entrance",
                        "group-hover:duration-fast",
                        indicatorVariantClasses[variant],
                    )}
                    style={{ width: `${clamped * 100}%` }}
                />
            </div>
        );
    },
);

ProgressBar.displayName = "ProgressBar";
