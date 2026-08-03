import { MermaidDiagram } from "./MermaidDiagram";
import { PlantUmlDiagram } from "./PlantUmlDiagram";

export interface DiagramProps {
    engine: "mermaid" | "plantuml";
    source: string;
}

/**
 * Dispatches to the right renderer by engine — the one thing both the
 * BlockNote editor's live preview (DiagramBlock.tsx) and the public
 * renderer (ContentBlocks.tsx) import, so neither has to know engine names
 * are even a thing. Not itself "use client" — it renders no DOM of its own,
 * just picks a client component, so it works from either a Server or
 * Client Component caller.
 */
export function Diagram({engine, source}: DiagramProps) {
    switch (engine) {
        case "mermaid":
            return <MermaidDiagram source={ source }/>;
        case "plantuml":
            return <PlantUmlDiagram source={ source }/>;
    }
}