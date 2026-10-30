"use client";
import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { inputBaseStyles, insetInputStyles } from "./Input";
import { useFieldControl } from "./field-context";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    appearance?: "default" | "inset";
    /** Defaults to `false` — most admin fields (a title, a short label) are one line; block-body Markdown fields opt into resizing explicitly. */
    resizable?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
    { className, appearance = "default", resizable = false, rows = 4, ...rest },
    ref,
) {
    const field = useFieldControl();
    return (
        <textarea
            ref={ref}
            rows={rows}
            aria-invalid={field.invalid || undefined}
            aria-describedby={field.descriptionId}
            className={cn(
                appearance === "inset" ? insetInputStyles : inputBaseStyles,
                "h-auto py-sm leading-relaxed",
                resizable ? "resize-y" : "resize-none",
                className,
            )}
            {...rest}
        />
    );
});

Textarea.displayName = "Textarea";
