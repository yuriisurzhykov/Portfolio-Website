"use client";

import * as React from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, type Simulation, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import type { WorkGraph } from "@/shared/lib/project-graph/computeProjectGraph";
import { GraphScene, type GraphSceneOptions, type RenderableGraphEdge, type RenderableGraphNode } from "./gl/GraphScene";
import { computeIdleFloatOffset } from "./gl/idleFloat";
import { nodeRadiusFor } from "./nodeRadius";

interface SimNode extends SimulationNodeDatum {
    id: string;
    r: number;
}
interface SimLink extends SimulationLinkDatum<SimNode> {
    similarity: number;
}

export interface UseGraphSceneParams {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    hitLayerRef: React.RefObject<HTMLDivElement | null>;
    graph: WorkGraph;
    /** slug -> display label, only used for the hit-target's native `title` tooltip (see this file's own comment on why hover targets are `aria-hidden`). */
    labels: ReadonlyMap<string, string>;
    options: GraphSceneOptions;
}

const BOUNDS_PADDING_PX = 24;

/**
 * d3-force has no concept of a viewport — without this, nodes drift
 * wherever `charge`/`link` push them, including off the visible canvas.
 * Reads the current size through a getter (not a captured value) because
 * this force is created once but the container can resize many times
 * over the component's lifetime.
 */
function boundsForce(getSize: () => { width: number; height: number }) {
    let nodes: SimNode[] = [];
    function force() {
        const { width, height } = getSize();
        for (const node of nodes) {
            const r = node.r;
            node.x = Math.max(BOUNDS_PADDING_PX + r, Math.min(width - BOUNDS_PADDING_PX - r, node.x ?? width / 2));
            node.y = Math.max(BOUNDS_PADDING_PX + r, Math.min(height - BOUNDS_PADDING_PX - r, node.y ?? height / 2));
        }
    }
    force.initialize = (assignedNodes: SimNode[]) => {
        nodes = assignedNodes;
    };
    return force;
}

/**
 * Owns everything imperative about the graph: the `d3-force` layout
 * simulation, the `GraphScene` WebGL renderer, the `requestAnimationFrame`
 * loop driving both, and a set of invisible hover/drag hit-targets
 * appended directly into `hitLayerRef` (bypassing React's render for that
 * subtree on purpose — see `project-graph/README.md`'s "why imperative"
 * entry; re-rendering React once per animation frame for a value nothing
 * else in the tree needs is the exact kind of avoidable render this
 * sidesteps).
 *
 * Drag uses the raw Pointer Events API, not `d3-drag` — one code path for
 * mouse/touch/pen, and `setPointerCapture` means `pointermove`/`pointerup`
 * keep firing on the SAME element even once the pointer has moved outside
 * the node's small circle, with no document-level listener needed.
 */
export function useGraphScene({ canvasRef, hitLayerRef, graph, labels, options }: UseGraphSceneParams): void {
    const optionsRef = React.useRef(options);
    optionsRef.current = options;

    const sceneRef = React.useRef<GraphScene | null>(null);
    const simulationRef = React.useRef<Simulation<SimNode, SimLink> | null>(null);
    const sizeRef = React.useRef({ width: 0, height: 0 });
    const hoveredIdRef = React.useRef<string | null>(null);
    const draggingIdRef = React.useRef<string | null>(null);
    const edgesRef = React.useRef<RenderableGraphEdge[]>([]);
    const hitElementsRef = React.useRef(new Map<string, HTMLDivElement>());
    // Shared clock between the render loop and drag handlers — both need
    // the SAME elapsed time to agree on the current idle-float offset (see
    // `gl/idleFloat.ts`'s own comment on why that agreement matters).
    const startTimeRef = React.useRef(performance.now());

    // Scene + rAF loop + resize wiring — created once per canvas element,
    // independent of data/option changes (those flow into the existing
    // instances via the effect below and via `optionsRef`, not by tearing
    // this one down and recreating it).
    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const scene = new GraphScene(canvas, optionsRef.current);
        sceneRef.current = scene;
        if (scene.diagnostics.length > 0) {
            // A shader that fails to compile/link never throws — surfacing
            // it loudly here is the difference between "the Hero graph
            // silently doesn't render" and an actionable console error.
            console.error("[ProjectGraph] WebGL shader problem, rendering nothing:\n" + scene.diagnostics.join("\n"));
        }

        const container = canvas.parentElement;
        if (container) {
            const rect = container.getBoundingClientRect();
            sizeRef.current = { width: rect.width, height: rect.height };
            scene.resize(rect.width, rect.height);
        }
        const resizeObserver = new ResizeObserver(() => {
            if (!container) return;
            const rect = container.getBoundingClientRect();
            sizeRef.current = { width: rect.width, height: rect.height };
            scene.resize(rect.width, rect.height);
            simulationRef.current?.force("center", forceCenter(rect.width / 2, rect.height / 2));
        });
        if (container) resizeObserver.observe(container);

        let frameId = requestAnimationFrame(function frame() {
            const simulation = simulationRef.current;
            if (simulation) {
                const timeSeconds = (performance.now() - startTimeRef.current) / 1000;
                const nodes: RenderableGraphNode[] = simulation.nodes().map((n) => ({ id: n.id, x: n.x ?? 0, y: n.y ?? 0, r: n.r }));
                scene.renderFrame(nodes, edgesRef.current, hoveredIdRef.current, timeSeconds);
                for (const node of nodes) {
                    const el = hitElementsRef.current.get(node.id);
                    if (!el) continue;
                    // Matches the SAME floated position `renderFrame` just
                    // drew the sphere at — without this, the invisible
                    // hit-target sits at the un-floated physics position
                    // while the visible sphere drifts away from it.
                    const floatX = computeIdleFloatOffset(node.id, timeSeconds, optionsRef.current.idleFloat, "x");
                    const floatY = computeIdleFloatOffset(node.id, timeSeconds, optionsRef.current.idleFloat, "y");
                    el.style.width = `${node.r * 2}px`;
                    el.style.height = `${node.r * 2}px`;
                    el.style.transform = `translate(${node.x + floatX - node.r}px, ${node.y + floatY - node.r}px)`;
                }
            }
            frameId = requestAnimationFrame(frame);
        });

        return () => {
            cancelAnimationFrame(frameId);
            resizeObserver.disconnect();
            scene.dispose();
            sceneRef.current = null;
        };
    }, [canvasRef]);

    // Data changes: rebuild the simulation's nodes/links and the DOM
    // hit-targets (hover + drag). Reuses the SAME `Simulation` instance
    // across updates (only replacing its `nodes`/`link` force) so
    // unrelated re-renders of the owning component don't reheat/reset
    // physics that had already settled.
    React.useEffect(() => {
        const hitLayer = hitLayerRef.current;
        if (!hitLayer) return;

        const simNodes: SimNode[] = graph.nodes.map((node) => ({ id: node.slug, r: nodeRadiusFor(node.connectionCount) }));
        const simLinks: SimLink[] = graph.edges.map((edge) => ({ source: edge.sourceSlug, target: edge.targetSlug, similarity: edge.similarity }));
        edgesRef.current = graph.edges.map((edge) => ({ sourceId: edge.sourceSlug, targetId: edge.targetSlug }));

        let simulation = simulationRef.current;
        if (!simulation) {
            simulation = forceSimulation<SimNode, SimLink>()
                .force("charge", forceManyBody().strength(-220))
                .force("collide", forceCollide<SimNode>((n) => n.r + 10))
                .force("bounds", boundsForce(() => sizeRef.current))
                .force("center", forceCenter(sizeRef.current.width / 2, sizeRef.current.height / 2));
            simulationRef.current = simulation;
        }
        simulation.nodes(simNodes);
        simulation
            .force(
                "link",
                forceLink<SimNode, SimLink>(simLinks)
                    .id((n) => n.id)
                    .distance((l) => 160 - l.similarity * 90)
                    .strength((l) => 0.15 + l.similarity * 0.5),
            )
            .alpha(1)
            .restart();

        const findSimNode = (id: string) => simulationRef.current?.nodes().find((n) => n.id === id);
        /** Pointer position in `hitLayer`-local px, MINUS the node's current idle-float offset — cancels the jitter out of the drag itself, so the sphere feels pinned exactly under the cursor instead of still breathing while held. */
        function pointerToSimPoint(event: PointerEvent, nodeId: string): { x: number; y: number } {
            // Non-null: this closure is only ever invoked from listeners
            // attached below, all created after the `if (!hitLayer) return;`
            // guard above already confirmed it — TS doesn't carry a `const`
            // narrowing through a `function` declaration used as an event
            // handler on its own, since it can't prove WHEN that handler runs.
            const rect = hitLayer!.getBoundingClientRect();
            const timeSeconds = (performance.now() - startTimeRef.current) / 1000;
            const floatX = computeIdleFloatOffset(nodeId, timeSeconds, optionsRef.current.idleFloat, "x");
            const floatY = computeIdleFloatOffset(nodeId, timeSeconds, optionsRef.current.idleFloat, "y");
            return { x: event.clientX - rect.left - floatX, y: event.clientY - rect.top - floatY };
        }

        const staleIds = new Set(hitElementsRef.current.keys());
        for (const node of graph.nodes) {
            staleIds.delete(node.slug);
            if (hitElementsRef.current.has(node.slug)) continue;

            const el = document.createElement("div");
            el.className = "absolute left-0 top-0 rounded-full cursor-grab";
            el.style.touchAction = "none"; // scoped to this node's own small circle, not the whole section — page scroll elsewhere is untouched
            // Purely a visual/mouse embellishment on top of content that's
            // already properly accessible via `SelectedWork`'s real links
            // — hidden from the accessibility tree entirely rather than
            // exposing a redundant, unlabeled hover-only pseudo-control.
            el.setAttribute("aria-hidden", "true");
            el.title = labels.get(node.slug) ?? node.slug;

            el.addEventListener("mouseenter", () => {
                hoveredIdRef.current = node.slug;
            });
            el.addEventListener("mouseleave", () => {
                if (draggingIdRef.current === node.slug) return; // still "hovered" for as long as it's being dragged, even once the pointer has moved outside the circle
                hoveredIdRef.current = null;
            });

            el.addEventListener("pointerdown", (event) => {
                const simNode = findSimNode(node.slug);
                if (!simNode || !simulationRef.current) return;
                event.preventDefault();
                el.setPointerCapture(event.pointerId);
                draggingIdRef.current = node.slug;
                hoveredIdRef.current = node.slug;
                el.classList.add("cursor-grabbing");
                simulationRef.current.alphaTarget(0.3).restart();
                const point = pointerToSimPoint(event, node.slug);
                simNode.fx = point.x;
                simNode.fy = point.y;
            });
            el.addEventListener("pointermove", (event) => {
                if (draggingIdRef.current !== node.slug) return;
                const simNode = findSimNode(node.slug);
                if (!simNode) return;
                const point = pointerToSimPoint(event, node.slug);
                simNode.fx = point.x;
                simNode.fy = point.y;
            });
            const endDrag = (event: PointerEvent) => {
                if (draggingIdRef.current !== node.slug) return;
                const simNode = findSimNode(node.slug);
                if (simNode) {
                    simNode.fx = null;
                    simNode.fy = null;
                }
                simulationRef.current?.alphaTarget(0);
                draggingIdRef.current = null;
                hoveredIdRef.current = null;
                el.classList.remove("cursor-grabbing");
                if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
            };
            el.addEventListener("pointerup", endDrag);
            el.addEventListener("pointercancel", endDrag);

            hitLayer.appendChild(el);
            hitElementsRef.current.set(node.slug, el);
        }
        for (const staleId of staleIds) {
            hitElementsRef.current.get(staleId)?.remove();
            hitElementsRef.current.delete(staleId);
            if (hoveredIdRef.current === staleId) hoveredIdRef.current = null;
            if (draggingIdRef.current === staleId) draggingIdRef.current = null;
        }
    }, [graph, hitLayerRef, labels]);
}
