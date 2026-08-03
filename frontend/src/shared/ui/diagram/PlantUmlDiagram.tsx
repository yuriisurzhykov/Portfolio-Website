"use client";

import { useEffect, useState } from "react";
import { encode } from "plantuml-encoder";
import { DiagramSurface } from "./DiagramSurface";

export interface PlantUmlDiagramProps {
    source: string;
}

/**
 * Renders a PlantUML diagram by fetching pre-rendered SVG from a self-hosted
 * plantuml-server, proxied through /api/diagrams/plantuml/[encoded] (see
 * that Route Handler's own comment for why GET + this specific encoding,
 * not a POST with a raw body: the encoding IS the cache key). Unlike
 * Mermaid, PlantUML has no client-side-only renderer — it genuinely needs a
 * real PlantUML/Graphviz backend somewhere.
 */
export function PlantUmlDiagram({source}: PlantUmlDiagramProps) {
    const [svg, setSvg] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function render() {
            try {
                const encoded = encode(source);
                const response = await fetch(`/api/diagrams/plantuml/${ encoded }`);
                if (!response.ok) {
                    const body = await response.json().catch(() => null);
                    throw new Error(body?.error ?? `Diagram service returned ${ response.status }.`);
                }
                const rendered = await response.text();
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
            cancelled = true;
        };
    }, [source]);

    if (error) {
        return (
            <div
                className="rounded-md border border-status-error/40 bg-status-error/10 p-sm text-caption text-status-error">
                { error }
            </div>
        );
    }

    if (!svg) {
        return <div className="h-30 rounded-md border border-border-subtle bg-surface-raised/50 animate-pulse"/>;
    }

    return <DiagramSurface svg={ svg }/>;
}