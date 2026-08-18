function hashSeed(id: string): number {
    let hash = 0;
    for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return hash;
}

/**
 * A per-node, deterministic "breathing" offset — same seed derivation used
 * by both `GraphScene` (drawing the sphere) and `useGraphScene` (positioning
 * the invisible hit-target on top of it, and correcting a drag's pointer
 * position against it). Kept in one place specifically so those two never
 * drift apart — they used to each compute this independently, which meant
 * the hit-target sat at the node's un-floated physics position while the
 * sphere visibly floated away from it, and dragging felt like grabbing the
 * wrong spot.
 */
export function computeIdleFloatOffset(id: string, timeSeconds: number, enabled: boolean, axis: "x" | "y"): number {
    if (!enabled) return 0;
    const seed = hashSeed(id);
    const freq = 0.25 + (seed % 10) / 40;
    const phase = seed % 6.28;
    const amplitude = 4;
    return axis === "x" ? Math.sin(timeSeconds * freq + phase) * amplitude : Math.cos(timeSeconds * freq * 1.3 + phase) * amplitude;
}
