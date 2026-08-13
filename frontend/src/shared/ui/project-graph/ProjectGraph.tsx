"use client";

import * as React from "react";
import type { WorkSummary } from "@portfolio/backend";
import { computeProjectGraph } from "@/shared/lib/project-graph/computeProjectGraph";
import { usePrefersReducedMotion } from "@/shared/lib/usePrefersReducedMotion";
import { useTranslation } from "@/shared/i18n";
import { useTheme } from "@/shared/theme";
import { cn } from "@/shared/lib/utils";
import { useGraphScene } from "./useGraphScene";
import type { GraphSceneOptions } from "./gl/GraphScene";

export interface ProjectGraphProps {
    items: WorkSummary[];
    /** Jaccard-similarity cutoff for drawing an edge — see `computeProjectGraph`'s own doc comment for why a threshold exists at all. */
    threshold?: number;
    /**
     * Explicit override for whether nodes idle-float. Omit to follow the
     * visitor's OS `prefers-reduced-motion` setting (the right default for
     * a real page) — pass `false` explicitly wherever the render needs to
     * be deterministic frame-to-frame, e.g. the Storybook screenshot demo
     * (see `component-gallery.manifest.ts`'s own comment on why animated
     * components need this).
     */
    idleFloat?: boolean;
    className?: string;
}

/** `oklch(0.72 0.17 45)` (this design system's one brand accent, `tokens.ts`'s `palette.accent`) converted to sRGB — WebGL uniforms need a plain 0..1 RGB triple, not a CSS color function string. */
const ACCENT_RGB: readonly [number, number, number] = [232 / 255, 116 / 255, 58 / 255];

/**
 * `tokens.ts`'s `darkPalette.bg`/`lightPalette.bg` and `text`, converted to
 * sRGB 0..1 triples — the WebGL canvas clears to (and grids against) its
 * OWN copy of these, since it can't inherit a CSS background the way a
 * regular DOM element would. Missing this entirely was the actual bug: an
 * always-dark canvas reads as a broken opaque box the moment the page
 * itself is in light theme, not merely "a bit off".
 */
const SCENE_PALETTE: Record<"light" | "dark", {
    background: readonly [number, number, number];
    ink: readonly [number, number, number]
}> = {
    dark: {background: [11 / 255, 11 / 255, 13 / 255], ink: [1, 1, 1]},
    light: {background: [247 / 255, 245 / 255, 240 / 255], ink: [24 / 255, 22 / 255, 20 / 255]},
};

/**
 * Top-left, same convention as this repo's shadow/highlight direction
 * everywhere else on the page — see `project-graph/README.md`'s "почему
 * top-left" entry for the full reasoning (perceptual consistency with the
 * rest of the UI's implied light source, not an arbitrary choice).
 */
const DEFAULT_LIGHT_POSITION = {x: 0.18, y: 0.16};

const BASE_SCENE_OPTIONS: Omit<GraphSceneOptions, "idleFloat" | "backgroundColor" | "inkColor"> = {
    accentColor: ACCENT_RGB,
    lightPosition: DEFAULT_LIGHT_POSITION,
    lightIntensity: 0.5,
    indexOfRefraction: 1.5,
    lensDepth: 260,
    reflectionReach: 1.6,
    fresnelBoost: 2,
    // Deliberately faint — production has no blueprint-grid backdrop (that
    // was a spike-only device to give the lens something to visibly bend).
    // Kept at a low, non-zero opacity purely as refraction "material" — see
    // the README's "Этап 5" entry for how this number was actually chosen
    // (checked live against the real Hero, not guessed).
    gridCellPx: 60,
    gridLineOpacity: 0.03,
    gridDotOpacity: 0.035,
};

export function ProjectGraph({items, threshold, idleFloat, className}: ProjectGraphProps) {
    const {pick} = useTranslation();
    const {theme} = useTheme();
    const prefersReducedMotion = usePrefersReducedMotion();
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const hitLayerRef = React.useRef<HTMLDivElement>(null);

    const graph = React.useMemo(() => computeProjectGraph(items, threshold), [items, threshold]);
    const labels = React.useMemo(() => new Map(items.map((item) => [item.slug, pick(item.title)])), [items, pick]);
    const options = React.useMemo<GraphSceneOptions>(() => {
        const palette = SCENE_PALETTE[theme];
        return {
            ...BASE_SCENE_OPTIONS,
            backgroundColor: palette.background,
            inkColor: palette.ink,
            idleFloat: idleFloat ?? !prefersReducedMotion,
        };
    }, [theme, idleFloat, prefersReducedMotion]);

    useGraphScene({canvasRef, hitLayerRef, graph, labels, options});

    if (items.length === 0) return null;

    return (
        <div className={ cn("relative", className) }>
            <canvas ref={ canvasRef } className="absolute inset-0 h-full w-full" aria-hidden="true"/>
            <div ref={ hitLayerRef } className="absolute inset-0"/>
        </div>
    );
}
