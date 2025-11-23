import * as React from "react";
import { forwardRef } from "react";
import { cn } from "@/shared/lib"

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
};

const baseStyles =
    "inline-flex items-center justify-center rounded-lg font-medium transition " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<ButtonVariant, string> = {
    primary: "bg-[image:var(--gradient-accent)] text-white hover:opacity-85 shadow-soft",
    secondary: "bg-elevated text-text hover:brightness-115 border border-border shadow-soft",
    ghost: "bg-transparent text-text hover:bg-elevated border border-transparent",
} as const;

const sizes: Record<ButtonSize, string> = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
        return (
            <button
                ref={ref}
                type="button"
                className={cn(baseStyles, sizes[size], variants[variant], className)}
                {...props}
            />
        );
    }
);

Button.displayName = "Button";