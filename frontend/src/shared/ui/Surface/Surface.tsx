import React, { forwardRef } from "react";
import { cn } from "@/shared/lib/utils.ts";

const defaultStyle = "bg-(--color-surface) border border-(--color-border) rounded-xl";

export type SurfaceProperties = React.HTMLAttributes<HTMLDivElement> & {
    elevated?: boolean;
}

export const Surface = forwardRef<HTMLDivElement, SurfaceProperties>(
    ({ className = "", elevated = true, ...props }: SurfaceProperties) => {
        const elevation = elevated ? "shadow-soft" : "shadow-none";
        return (
            <div
                className={cn(defaultStyle, elevation, className)}
                {...props}
            />
        );
    }
);

Surface.displayName = "Surface";