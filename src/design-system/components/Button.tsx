import * as React from "react";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost";
    size?: "sm" | "md" | "lg";
};

const base =
    "inline-flex items-center justify-center rounded-lg font-medium transition " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-cyan) " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-bg) " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

const variants = {
    primary: "bg-[image:var(--gradient-accent)] text-white hover:opacity-85 shadow-soft",
    secondary: "bg-(--color-elevated) text-(--color-text) hover:brightness-115 border border-(--color-border) shadow-soft",
    ghost: "bg-transparent text-(--color-text) hover:bg-(--color-elevated) border border-transparent",
} as const;

const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
};

export function Button({className = "", variant = "primary", size = "md", ...props}: ButtonProps) {
    return (
        <button
            className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
            {...props}
        />
    );
}