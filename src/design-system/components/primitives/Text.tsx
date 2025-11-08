import {type JSX} from "react";
import * as React from "react";
import {type TextVariant, typography} from "../../typography";
import {cn} from "../../../utils/cn";

type Props = {
    as?: keyof JSX.IntrinsicElements;
    variant?: TextVariant;
    className?: string;
    children?: React.ReactNode;
};

export function Text({as = "p", variant = "body", className, children}: Props) {
    const Comp = as as any;
    const t = typography[variant];
    return (
        <Comp
            className={cn("text-[--color-text]", className)}
            style={{
                fontFamily: "var(--font-body)",
                fontWeight: t.weightVar as any,
                fontSize: t.fontSize,
                lineHeight: t.lineHeight
            }}
        >
            {children}
        </Comp>
    );
}