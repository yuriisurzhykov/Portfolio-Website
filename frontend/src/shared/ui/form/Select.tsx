import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { inputBaseStyles } from "./Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
    function Select({ className, children, ...rest }, ref) {
        return (
            <div className="relative">
                <select
                    ref={ref}
                    className={cn(inputBaseStyles, "appearance-none pr-2xl cursor-pointer", className)}
                    {...rest}
                >
                    {children}
                </select>
                <ChevronDown
                    className="pointer-events-none absolute right-sm top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
                    aria-hidden="true"
                />
            </div>
        );
    },
);

Select.displayName = "Select";
