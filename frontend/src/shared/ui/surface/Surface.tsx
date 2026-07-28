import React, { type ForwardedRef, forwardRef } from "react";
import { cn } from "@/shared/lib/utils";

const defaultStyle = "bg-surface border border-border rounded-xl";

export type SurfaceProperties = React.HTMLAttributes<HTMLDivElement> & {
    elevated?: boolean;
}

export const Surface = forwardRef<HTMLDivElement, SurfaceProperties>(
    ({ className = "", elevated = true, ...props }: SurfaceProperties, ref: ForwardedRef<HTMLDivElement>) => {
        const elevation = elevated ? "shadow-soft" : "shadow-none";
        return (
            <div
                ref={ref}
                className={cn(defaultStyle, elevation, className)}
                {...props}
            />
        );
    }
);

Surface.displayName = "Surface";