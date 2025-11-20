import * as React from "react";
import { forwardRef, type JSX } from "react";
import { type TextVariant, typography } from "@/shared/ui/theme";
import { cn } from "@/shared/lib/utils.ts";

const defaultStyle = "text-(--color-text)";

export type TextProperties = {
    as?: keyof JSX.IntrinsicElements;
    variant?: TextVariant;
    className?: string;
    children?: React.ReactNode;
};

export const Text = forwardRef(
    ({ as = "p", variant = "body", className = "", children }: TextProperties) => {
        const Comp = as as any;
        const textVariant = typography[variant];
        const fontFamily = variant == "mono" ? "var(--font-mono)" : "var(--font-body)";
        return (
            <Comp
                className={cn(defaultStyle, className)}
                style={{
                    fontFamily: fontFamily,
                    fontWeight: textVariant.weightVar as any,
                    fontSize: textVariant.fontSize,
                    lineHeight: textVariant.lineHeight
                }}
            >
                {children}
            </Comp>
        );
    }
);