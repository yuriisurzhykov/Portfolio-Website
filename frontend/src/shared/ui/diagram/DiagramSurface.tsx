"use client"

import { DiagramLightbox } from "./DiagramLightbox";
import { Maximize2 } from "lucide-react";
import { useState } from "react";


export interface DiagramSurfaceProps {
    /**
     * Already-rendered SVG markup, from either MermaidDiagram or (later) PlantUmlDiagram.
     * */
    svg: string;
}

/**
 * Shared presentation shell for a rendered diagram — shows the SVG as a
 * static thumbnail with an ALWAYS-visible expand icon (not hover-only:
 * hover doesn't exist on touch, see DiagramLightbox's own comment on the
 * same point), and opens DiagramLightbox for pan/zoom on click.
 * MermaidDiagram/PlantUmlDiagram only need to produce the SVG string; this
 * owns how it's DISPLAYED, so neither engine has to duplicate the
 * expand/zoom wiring itself.
 */
export function DiagramSurface({svg}: DiagramSurfaceProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={ () => setOpen(true) }
                aria-label="Expand diagram"
                className="group relative w-full rounded-md border border-border-subtle bg-surface-raised/30 p-sm cursor-zoom-in"
            >
                <div className="[&_svg]:mx-auto [&_svg]:max-w-full [&_svg]:h-auto"
                     dangerouslySetInnerHTML={ {__html: svg} }/>
                <span
                    className="absolute top-xs right-xs flex h-8 w-8 items-center justify-center rounded-md bg-surface-base border border-border-default text-text-secondary group-hover:text-text-primary">
                    <Maximize2 size={ 16 }/>
                </span>
            </button>
            <DiagramLightbox open={ open } onClose={ () => setOpen(false) } svg={ svg }/>
        </>
    );
}