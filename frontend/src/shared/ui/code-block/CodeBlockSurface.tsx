// src/shared/ui/code/CodeBlockSurface.tsx
import type { ReactNode } from "react";
import * as React from "react";
import { cn } from "@/shared/lib";

export type CodeBlockSurfaceProps = {
    className?: string;
    children: ReactNode;
};

/**
 * CodeBlockSurface
 * ----------------
 * Surface wrapper for the code block: background, border, shadow, typography.
 */
const surfaceBaseStyles =
    [
        "flex flex-col",
        "bg-surface-base",
        "border border-border-default",
        "rounded-md",
        "shadow-surface-deep",
        "overflow-hidden",
        "font-mono text-body text-text-primary",
    ].join(" ");

export const CodeBlockSurface: React.FC<CodeBlockSurfaceProps> = ({
                                                                      className,
                                                                      children,
                                                                  }) => {
    return (
        <figure className={cn(surfaceBaseStyles, className)}>
            {children}
        </figure>
    );
};
