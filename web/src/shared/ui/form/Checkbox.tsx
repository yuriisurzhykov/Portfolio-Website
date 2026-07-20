import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
    label: string;
    /** Same idea as `Field`'s hint — a checkbox whose EFFECT isn't obvious from its label alone (e.g. "Has a case study": what does turning it on actually change?) needs somewhere to say so, right under the label, not just in a tooltip nobody hovers. */
    hint?: string;
}

/**
 * A real `<input type="checkbox">`, visually replaced — not a `<div>` with
 * a click handler — so keyboard (Space toggles), screen readers (native
 * checked/label association via `<label>` wrapping), and form semantics
 * all work for free.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    function Checkbox({ label, hint, className, checked, ...rest }, ref) {
        return (
            <label className={cn("inline-flex items-start gap-sm cursor-pointer select-none", className)}>
                <span className="relative inline-flex shrink-0 mt-[1px]">
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
                <span className="flex flex-col gap-[2px]">
                    <span className="text-body text-text-primary">{label}</span>
                    {hint && <span className="text-micro normal-case tracking-normal text-text-faint">{hint}</span>}
                </span>
            </label>
        );
    },
);

Checkbox.displayName = "Checkbox";
