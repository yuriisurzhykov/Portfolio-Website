"use client"

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/shared/theme";
import { colors, colorsLight } from "@/shared/ui/theme/tokens";
import { DiagramSurface } from "@/shared/ui/diagram/DiagramSurface";

export interface MermaidDiagramProps {
    source: string;
}

type PortfolioColors = typeof colors;

/**
 * Real color VALUES per theme, not CSS `var(...)` references. Found live,
 * not assumed: Mermaid's "base" theme runs every themeVariable through its
 * own color-math library to derive borders/hover shades, and that library
 * parses the literal string it's given as an actual CSS color (hex/rgb/hsl)
 * — it has no access to the browser's CSS engine, so `var(--foo)` fails
 * with "Unsupported color format" instead of ever resolving. This means a
 * diagram must be RE-RENDERED on theme change (see the `theme` dependency
 * in the effect below) rather than repainting for free via CSS cascade.
 */
function themeVariablesFor(c: PortfolioColors) {
    return {
        background: "transparent",
        primaryColor: c.surface.raised,
        primaryTextColor: c.text.primary,
        primaryBorderColor: c.border.default,
        lineColor: c.border.strong,
        secondaryColor: c.surface.base,
        tertiaryColor: c.accent.tintBg,
        fontFamily: "'JetBrains Mono', monospace",
        edgeLabelBackground: c.surface.base,
    };
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
                const themeVariables = themeVariablesFor(theme === "dark" ? colors : colorsLight);
                mermaid.initialize({startOnLoad: false, theme: "base", themeVariables: themeVariables});

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