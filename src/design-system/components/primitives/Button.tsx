import * as React from "react";
import {cn} from "../../../utils/cn";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost";
    size?: "sm" | "md" | "lg";
};

const VARIANTS = {
    primary: "bg-[--accent-cyan] text-black hover:opacity-90",
    secondary: "bg-[--color-elevated] text-[--color-text] hover:brightness-110 border border-[--color-border]",
    ghost: "bg-transparent text-[--color-text] hover:bg-[--color-elevated]",
};

const SIZES = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-4 text-base",
    lg: "h-12 px-6 text-base",
};

export function Button({className, variant = "primary", size = "md", ...props}: ButtonProps) {
    return (
        <button
            className={cn(
                "rounded-[--radius-lg] transition-all shadow-[--shadow-soft]",
                VARIANTS[variant],
                SIZES[size],
                className,
            )}
            {...props}
        />)
}