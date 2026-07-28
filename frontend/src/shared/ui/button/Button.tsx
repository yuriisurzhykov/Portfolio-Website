import * as React from "react";
import { forwardRef } from "react";
import { cn } from "@/shared/lib";
import type { ButtonProps, ButtonSize, ButtonVariant } from "@/shared/ui/button/Button.types";

export const buttonBaseStyles =
    [
        "inline-flex items-center justify-center",
        "gap-xs",
        "rounded-md font-semibold",
        "transition-all duration-normal ease-standard",
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-border-highlight",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        "data-[loading=true]:cursor-wait",
    ].join(" ");

export const buttonVariantClasses: Record<ButtonVariant, string> = {
    primary: [
        "bg-accent-solid",
        "text-accent-on-solid",
        "hover:bg-accent-solid-hover",
        "active:scale-press",
    ].join(" "),
    secondary: [
        "text-text-primary",
        "bg-transparent",
        "border border-border-strong",
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

export const buttonSizeClasses: Record<ButtonSize, string> = {
    sm: "h-10 px-sm text-caption",
    md: "h-12 px-lg text-body",
    lg: "h-14 px-xl text-body-lg",
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
                    buttonBaseStyles,
                    buttonSizeClasses[size],
                    buttonVariantClasses[variant],
                    fullWidth && "w-full",
                    className
                )}
                disabled={isDisabled}
                data-loading={loading ? "true" : "false"}
                aria-disabled={isDisabled}
                {...rest}
            >
                {iconLeft && (<span className="inline-flex items-center">{iconLeft}</span>)}

                <span className="inline-flex items-center">{children}</span>

                {iconRight && (<span className="inline-flex items-center">{iconRight}</span>)}
            </button>
        );
    }
);

Button.displayName = "Button";