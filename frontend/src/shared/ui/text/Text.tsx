import type { ForwardedRef } from "react";
import * as React from "react";
import { cn } from "@/shared/lib/utils";

/**
 * TEXT VARIANTS
 * Match strictly with the names in typography.fontSize from tokens.ts.
 * `hero`/`h1` are fluid (`clamp()`); everything else is a fixed rem size —
 * see `tokens/typography.ts` for the real, current values (these comments
 * used to reference stale pre-migration pixel values).
 */
export type TextVariant =
    | "hero"
    | "display"
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "body-lg"
    | "body"
    | "caption"
    | "micro"
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
    | "faint"
    | "inverse"
    | "aurora"
    | "inherit";

export type TextAlign = "left" | "center" | "right" | "justify";

/**
 * Properties
 */
export interface TextProperties extends React.HTMLAttributes<HTMLElement> {
    /** The HTML tag to render (p, h1, span, etc.) */
    as?: React.ElementType;
    /** The typography style variant */
    variant?: TextVariant;
    /** The color/texture of the text */
    tone?: TextTone;
    /** text alignment */
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
    hero: "text-hero font-extrabold tracking-tight leading-tight",
    display: "text-display font-bold tracking-tight leading-tight",
    h1: "text-h1 font-extrabold tracking-tight leading-tight",
    h2: "text-h2 font-semibold tracking-tight leading-normal",
    h3: "text-h3 font-semibold leading-normal",
    // h4/h5 have no token of their own — h5 is used for real (admin
    // section headings) and its old raw size (text-xl, 20px) already
    // exactly matched h3's token; h4 is unused outside the Storybook demo
    // and its old raw size (text-2xl, 24px) was actually LARGER than h3 —
    // backwards for a heading hierarchy. Both now alias h3 rather than
    // inventing a new step; see theme/README.md's dated entry.
    h4: "text-h3 font-semibold leading-normal",
    h5: "text-h3 font-semibold leading-normal",
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
    faint: "text-text-faint",
    inverse: "text-text-inverse",
    aurora: "text-accent-text",
    inherit: "",
};

const defaultTags: Record<TextVariant, React.ElementType> = {
    hero: "h1",
    display: "h2",
    h1: "h1",
    h2: "h2",
    h3: "h3",
    h4: "h4",
    h5: "h5",
    "body-lg": "p",
    body: "p",
    caption: "span",
    micro: "span",
    mono: "code",
};

/**
 * COMPONENT
 */
export const Text = React.forwardRef<HTMLElement, TextProperties>(
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
        }: TextProperties,
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