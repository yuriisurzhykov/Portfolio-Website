import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
    label: string;
}

/**
 * A real `<input type="checkbox">`, visually replaced — not a `<div>` with
 * a click handler — so keyboard (Space toggles), screen readers (native
 * checked/label association via `<label>` wrapping), and form semantics
 * all work for free.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    function Checkbox({ label, className, checked, ...rest }, ref) {
        return (
            <label className={cn("inline-flex items-center gap-sm cursor-pointer select-none", className)}>
                <span className="relative inline-flex shrink-0">
                    <input ref={ref} type="checkbox" checked={checked} className="peer sr-only" {...rest} />
                    <span
                        className={cn(
                            "w-5 h-5 rounded-sm border border-border-strong bg-surface-base",
                            "flex items-center justify-center transition-colors duration-fast",
                            "peer-checked:bg-accent-solid peer-checked:border-accent-solid",
                            "peer-focus-visible:ring-2 peer-focus-visible:ring-border-highlight/40",
                        )}
                    >
                        {checked && <Check className="w-3.5 h-3.5 text-accent-on-solid" aria-hidden="true" />}
                    </span>
                </span>
                <span className="text-body text-text-primary">{label}</span>
            </label>
        );
    },
);

Checkbox.displayName = "Checkbox";
