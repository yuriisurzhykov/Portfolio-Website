import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { inputBaseStyles } from "./Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    /** Defaults to `false` — most admin fields (a title, a short label) are one line; block-body Markdown fields opt into resizing explicitly. */
    resizable?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    function Textarea({ className, resizable = false, rows = 4, ...rest }, ref) {
        return (
            <textarea
                ref={ref}
                rows={rows}
                className={cn(
                    inputBaseStyles,
                    "h-auto py-sm leading-relaxed",
                    resizable ? "resize-y" : "resize-none",
                    className,
                )}
                {...rest}
            />
        );
    },
);

Textarea.displayName = "Textarea";
