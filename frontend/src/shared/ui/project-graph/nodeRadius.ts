const MIN_RADIUS_PX = 20;
const MAX_RADIUS_PX = 46;
const RADIUS_PER_CONNECTION_PX = 5;

/**
 * Visual size is deliberately NOT part of `computeProjectGraph` (shared/lib)
 * — that module stays pure graph structure (slugs, tags, similarity), no
 * pixel values, no design-token concerns. This is the one place
 * "connection count -> how big does the sphere look" is decided, so a
 * future re-tuning of the min/max/step never has to touch the graph math.
 */
export function nodeRadiusFor(connectionCount: number): number {
    return Math.min(MAX_RADIUS_PX, MIN_RADIUS_PX + connectionCount * RADIUS_PER_CONNECTION_PX);
}
