import * as React from "react";
import {type JSX} from "react";
import {type TextVariant, typography} from "../design/typography.ts";

type Props = {
    as?: keyof JSX.IntrinsicElements;
    variant?: TextVariant;
    className?: string;
    children?: React.ReactNode;
};

export function Text({as = "p", variant = "body", className = "", children}: Props) {
    const Comp = as as any;
    const textVariant = typography[variant];
    const fontFamily = variant == "mono" ? "var(--font-mono)" : "var(--font-body)";
    return (
        <Comp
            className={`text-(--color-text) ${className}`}
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