"use client"

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/shared/theme";
import { createMermaidTheme } from "@/shared/ui/theme/adapters";
import { DiagramSurface } from "@/shared/ui/diagram/DiagramSurface";

export interface MermaidDiagramProps {
    source: string;
}

let idCounter = 0;

/**
 * Renders a Mermaid diagram client-side. Dynamically imported inside the
 * effect (not a top-level import) to keep Mermaid's ~370 KB out of the
 * initial bundle for pages that don't happen to have a diagram block —
 * Mermaid also touches DOM APIs (`getBBox`) that don't exist during SSR.
 */
export function MermaidDiagram({source}: MermaidDiagramProps) {
    const {theme} = useTheme();
    const [svg, setSvg] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const idRef = useRef<string>(`mermaid-diagram-${ idCounter++ }`);

    useEffect(() => {
        let cancelled = false;

        async function render() {
            try {
                const {default: mermaid} = await import("mermaid");
                const {theme: mermaidTheme, themeVariables} = createMermaidTheme(theme);
                // Pinned explicitly rather than relied on as a dependency
                // default: Mermaid 11 already defaults to "strict" (verified
                // live — a hand-crafted malicious node label produces no
                // <script>/event-handler output), but a future major version
                // changing that default would silently reopen this. The
                // sanitize-svg.ts pass in DiagramSurface is the second,
                // independent layer that holds even if this one regresses.
                mermaid.initialize({
                    startOnLoad: false,
                    theme: mermaidTheme,
                    themeVariables: themeVariables,
                    securityLevel: "strict",
                });

                const {svg: rendered} = await mermaid.render(idRef.current, source);
                if (!cancelled) {
                    setSvg(rendered);
                    setError(null);
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : "Failed to render diagram.");
                    setSvg(null);
                }
            }
        }

        void render();
        return () => {
            cancelled = true
        };
    }, [source, theme]);

    if (error) {
        return (
            <div
                className="rounded-md border border-status-error/40 bg-status-error/10 p-sm text-caption text-status-error">
                Diagram render error: { error }
            </div>
        );
    }

    if (!svg) {
        return <div className="h-30 rounded-md border border-border-subtle bg-surface-raised/50 animate-pulse"/>;
    }

    return <DiagramSurface svg={ svg }/>;
}
