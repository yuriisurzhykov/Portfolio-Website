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
// Code panels stay dark regardless of the active site theme, matching the
// approved design (FlowBus.kt keeps its dark "terminal" look on both the
// light and dark page) — pinned to the fixed `codePanel` tokens, never the
// theme-reactive `surface-*`/`text-*` ones.
const surfaceBaseStyles =
    [
        "flex flex-col",
        "bg-code-panel-bg",
        "border border-code-panel-border",
        "rounded-md",
        "shadow-surface-deep",
        "overflow-hidden",
        "font-mono text-body text-code-panel-code",
    ].join(" ");

export const CodeBlockSurface: React.FC<CodeBlockSurfaceProps> = ({
                                                                      className,
                                                                      children,
                                                                  }) => {
    return (
        <figure className={ cn(surfaceBaseStyles, className) }>
            { children }
        </figure>
    );
};
