import type { ForwardedRef, HTMLAttributes } from "react";
import * as React from "react";
import { cn } from "@/shared/lib/utils";

export type EyebrowTone = "accent" | "muted";

export interface EyebrowProps extends HTMLAttributes<HTMLParagraphElement> {
    tone?: EyebrowTone;
}

const toneClasses: Record<EyebrowTone, string> = {
    accent: "text-accent-text",
    muted: "text-text-muted",
};

/**
 * Eyebrow
 * -------
 * The small uppercase mono label used above every section/page title
 * ("STACK", "SELECTED WORK", "ALL WORK", "CASE STUDY", ...). `tone="accent"`
 * marks the page-identity kicker (one per page); `tone="muted"` marks
 * in-page section labels — matches the approved design exactly.
 */
export const Eyebrow = React.forwardRef<HTMLParagraphElement, EyebrowProps>(
    function Eyebrow(
        {tone = "muted", className, children, ...rest}: EyebrowProps,
        ref: ForwardedRef<HTMLParagraphElement>,
    ) {
        return (
            <p
                ref={ ref }
                className={ cn(
                    "font-mono font-bold text-micro uppercase tracking-[0.12em]",
                    toneClasses[tone],
                    className,
                ) }
                { ...rest }
            >
                { children }
            </p>
        );
    },
);

Eyebrow.displayName = "Eyebrow";
