import * as React from "react";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost";
    size?: "sm" | "md" | "lg";
};

const base = "inline-flex items-center justify-center rounded-lg font-medium transition";

const variants = {
    primary: "bg-[--accent-cyan] text-black hover:opacity-90",
    secondary: "bg-[--color-elevated] text-[--color-text] hover:brightness-110 border border-[--color-border]",
    ghost: "bg-transparent text-[--color-text] hover:bg-[--color-elevated]",
};

const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-4 text-base",
    lg: "h-12 px-6 text-base",
};

export function Button({className, variant = "primary", size = "md", ...props}: ButtonProps) {
    return (
        <button
            className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
            {...props}
        />)
}