import * as React from "react";
import { cn } from "@/shared/lib/utils";

export const inputBaseStyles = [
    "w-full h-11 px-sm",
    "rounded-md",
    "bg-surface-base",
    "border border-border-strong",
    "text-body text-text-primary",
    "placeholder:text-text-faint",
    "transition-colors duration-fast",
    "focus-visible:outline-none focus-visible:border-border-highlight",
    "focus-visible:ring-2 focus-visible:ring-border-highlight/40",
    "disabled:opacity-60 disabled:cursor-not-allowed",
].join(" ");

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    function Input({ className, ...rest }, ref) {
        return <input ref={ref} className={cn(inputBaseStyles, className)} {...rest} />;
    },
);

Input.displayName = "Input";
