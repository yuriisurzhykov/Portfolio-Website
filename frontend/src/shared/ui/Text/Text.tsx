import type { ForwardedRef } from "react";
import * as React from "react";
import { cn } from "@/shared/lib/utils";

/**
 * TEXT VARIANTS
 * Match strictly with the names in typography.fontSize from tokens.ts
 */
export type TextVariant =
    | "hero"       // 6rem / 96px
    | "display"    // 3.75rem / 60px
    | "h1"         // 3rem / 48px
    | "h2"         // 2.25rem / 36px
    | "h3"         // 1.5rem / 24px
    | "body-lg"    // 1.25rem / 20px
    | "body"       // 1rem / 16px
    | "caption"    // 0.875rem / 14px
    | "micro"      // 0.75rem / 12px
    | "mono";      // Code font

/**
 * TEXT TONES
 * Abstract colors for semantic purposes.
 * 'aurora' automatically applies the brand gradient.
 */
export type TextTone =
    | "primary"
    | "secondary"
    | "muted"
    | "inverse"
    | "aurora"
    | "inherit";

export type TextAlign = "left" | "center" | "right" | "justify";

/**
 * PROPS
 */
export interface TextProps extends React.HTMLAttributes<HTMLElement> {
    /** The HTML tag to render (p, h1, span, etc.) */
    as?: React.ElementType;
    /** The typography style variant */
    variant?: TextVariant;
    /** The color/texture of the text */
    tone?: TextTone;
    /** Text alignment */
    align?: TextAlign;
    /** Prevent text wrapping */
    noWrap?: boolean;
    /** Truncate with ellipsis (...) */
    truncate?: boolean;
}

/**
 * MAPPINGS
 * We map props to Tailwind classes directly.
 * This allows the CSS engine to handle responsiveness and dark mode.
 */

const variantClasses: Record<TextVariant, string> = {
    hero: "text-hero font-bold tracking-tight leading-tight",
    display: "text-display font-bold tracking-tight leading-tight",
    h1: "text-h1 font-bold tracking-tight leading-tight",
    h2: "text-h2 font-semibold tracking-tight leading-normal",
    h3: "text-h3 font-semibold leading-normal",
    "body-lg": "text-body-lg font-regular leading-relaxed",
    body: "text-body font-regular leading-normal",
    caption: "text-caption font-medium leading-normal",
    micro: "text-micro font-medium uppercase tracking-wider",
    mono: "font-mono text-body", // Specific override for code
};

const toneClasses: Record<TextTone, string> = {
    primary: "text-text-primary",
    secondary: "text-text-secondary",
    muted: "text-text-muted",
    inverse: "text-text-inverse",
    aurora: "text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-magenta",
    inherit: "",
};

const defaultTags: Record<TextVariant, React.ElementType> = {
    hero: "h1",
    display: "h2",
    h1: "h1",
    h2: "h2",
    h3: "h3",
    "body-lg": "p",
    body: "p",
    caption: "span",
    micro: "span",
    mono: "code",
};

/**
 * COMPONENT
 */
export const Text = React.forwardRef<HTMLElement, TextProps>(
    (
        {
            as,
            variant = "body",
            tone = "primary",
            align,
            noWrap,
            truncate,
            className,
            children,
            ...props
        }: TextProps,
        ref: ForwardedRef<HTMLElement>
    ) => {
        // 1. Resolve the tag. If 'as' is missing, fallback to the default tag for the variant.
        const Component = as || defaultTags[variant] || "p";

        return (
            <Component
                ref={ref}
                className={cn(
                    variantClasses[variant],
                    toneClasses[tone],
                    align && `text-${align}`,
                    noWrap && "whitespace-nowrap",
                    truncate && "truncate",
                    className
                )}
                {...props}
            >
                {children}
            </Component>
        );
    }
);

Text.displayName = "Text";