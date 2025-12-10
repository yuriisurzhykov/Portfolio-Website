import * as React from "react";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/shared/lib";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Icon to the left of text */
    iconLeft?: ReactNode;
    /** Icon to the right from text */
    iconRight?: ReactNode;
    /** Stretches the button to the full available width */
    fullWidth?: boolean;
    /** Whether system loader should be enabled for the button on hover */
    loading?: boolean;
};

const baseStyles =
    [
        "inline-flex items-center justify-center",
        "gap-xs", // из spacing-токенов
        "rounded-pill font-medium",
        "transition-colors duration-fast ease-standard",
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-border-highlight",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        "data-[loading=true]:cursor-wait",
    ].join(" ");

const variants: Record<ButtonVariant, string> = {
    primary: [
        "bg-[image:var(--color-accent-aurora-fill)]",
        "text-primary",
        "shadow-soft-glow",
        "hover:opacity-90",
        "active:opacity-80 active:scale-press",
    ].join(" "),
    secondary: [
        "text-text-primary",
        "border border-border-default",
        "shadow-soft-glow",
        "hover:bg-surface-raised",
        "active:scale-press",
    ].join(" "),
    ghost: [
        "bg-transparent",
        "text-text-primary",
        "border border-transparent",
        "hover:bg-surface-base/60 hover:border-border-subtle",
        "active:bg-surface-raised/70 active:scale-press",
    ].join(" "),
};

const sizes: Record<ButtonSize, string> = {
    sm: "h-10 px-sm text-caption",
    md: "h-12 px-lg text-body",
    lg: "h-14 px-xlg text-body-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = "primary",
            size = "md",
            iconLeft,
            iconRight,
            fullWidth,
            loading,
            disabled,
            type,
            children,
            ...rest
        },
        ref
    ) => {
        const isDisabled = disabled || loading;

        return (
            <button
                ref={ref}
                type={type ?? "button"}
                className={cn(
                    baseStyles,
                    sizes[size],
                    variants[variant],
                    fullWidth && "w-full",
                    className
                )}
                disabled={isDisabled}
                data-loading={loading ? "true" : "false"}
                aria-disabled={isDisabled}
                {...rest}
            >
                {iconLeft && (
                    <span className="inline-flex items-center">
            {iconLeft}
          </span>
                )}

                <span className="inline-flex items-center">{children}</span>

                {iconRight && (
                    <span className="inline-flex items-center">
            {iconRight}
          </span>
                )}
            </button>
        );
    }
);

Button.displayName = "Button";