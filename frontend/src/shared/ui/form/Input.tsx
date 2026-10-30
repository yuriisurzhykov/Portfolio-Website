"use client";
import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { insetControlStyles } from "./control-styles";
import { useFieldControl } from "./field-context";

const inputCommonStyles = [
    "w-full h-11 px-sm",
    "rounded-md",
    "border",
    "text-text-primary",
    "placeholder:text-text-faint",
    "transition-colors duration-fast",
    "focus-visible:outline-none focus-visible:border-border-highlight",
    "focus-visible:ring-2 focus-visible:ring-border-highlight/40",
    "disabled:opacity-60 disabled:cursor-not-allowed",
].join(" ");

export const inputBaseStyles = cn(inputCommonStyles, "bg-surface-base border-border-strong text-body");
export const insetInputStyles = cn(inputCommonStyles, insetControlStyles);

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    appearance?: "default" | "inset";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
    { className, appearance = "default", ...rest },
    ref,
) {
    const field = useFieldControl();
    return (
        <input
            ref={ref}
            aria-invalid={field.invalid || undefined}
            aria-describedby={field.descriptionId}
            className={cn(appearance === "inset" ? insetInputStyles : inputBaseStyles, className)}
            {...rest}
        />
    );
});

Input.displayName = "Input";
