import type { ForwardedRef, HTMLAttributes } from "react";
import * as React from "react";
import { cn } from "@/shared/lib/utils";

export type EyebrowTone = "accent" | "muted";
type EyebrowElement = HTMLParagraphElement | HTMLHeadingElement;

export interface EyebrowProps extends HTMLAttributes<HTMLElement> {
    tone?: EyebrowTone;
    as?: "p" | "h2";
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
export const Eyebrow = React.forwardRef<EyebrowElement, EyebrowProps>(
    function Eyebrow(
        { tone = "muted", as, className, children, ...rest }: EyebrowProps,
        ref: ForwardedRef<EyebrowElement>,
    ) {
        const Component = as ?? "p";

        return (
            <Component
                ref={ ref }
                className={ cn(
                    "font-mono font-bold text-micro uppercase tracking-widest",
                    toneClasses[tone],
                    className,
                ) }
                { ...rest }
            >
                { children }
            </Component>
        );
    },
);

Eyebrow.displayName = "Eyebrow";
