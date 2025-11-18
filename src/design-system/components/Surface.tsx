import React from "react";

export type SurfaceProperties = React.HTMLAttributes<HTMLDivElement> & {
    elevated?: boolean;
}

export function Surface({className = "", elevated = true, ...props}: SurfaceProperties) {
    const elevation = elevated ? "shadow-soft" : "shadow-none";
    return (
        <div
            className={`bg-(--color-surface) border border-(--color-border) rounded-xl ${elevation} ${className}`}
            {...props}
        />
    );
}