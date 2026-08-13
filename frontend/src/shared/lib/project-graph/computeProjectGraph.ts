import type { WorkSummary } from "@portfolio/backend";

export interface WorkGraphNode {
    slug: string;
    tags: string[];
    /** How many other nodes this one is connected to, at the threshold the graph was computed with — the rendering layer maps this to visual size/prominence, not this module. */
    connectionCount: number;
}

export interface WorkGraphEdge {
    /** Stable identity for a diffing/animation layer (e.g. a React/d3 `.join()` key) — independent of `source`/`target` possibly getting mutated into object references by a force-layout library downstream. */
    key: string;
    sourceSlug: string;
    targetSlug: string;
    similarity: number;
}

export interface WorkGraph {
    nodes: WorkGraphNode[];
    edges: WorkGraphEdge[];
}

/**
 * Below this, no edge is drawn at all — the "real relationship" premise
 * (see project-graph/README.md) breaks down into an unreadable hairball
 * once enough `Work` items share at least one common tag, which most pairs
 * eventually will as the catalog grows.
 */
export const DEFAULT_SIMILARITY_THRESHOLD = 0.17;

/**
 * Jaccard similarity of two tag sets: `|intersection| / |union|`, case-
 * insensitive. `1` for identical (non-empty) sets, `0` for disjoint sets
 * OR when both are empty (no shared vocabulary to claim a relationship
 * from, even though `0/0` is mathematically undefined).
 */
export function computeTagSimilarity(tagsA: string[], tagsB: string[]): number {
    const setA = new Set(tagsA.map((tag) => tag.toLowerCase()));
    const setB = new Set(tagsB.map((tag) => tag.toLowerCase()));

    let intersectionSize = 0;
    for (const tag of setA) {
        if (setB.has(tag)) intersectionSize++;
    }

    const unionSize = setA.size + setB.size - intersectionSize;
    return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

/**
 * The "real relationship" graph behind the Hero's project visualization:
 * an edge exists between two `Work` items only when their `stack` tags
 * overlap enough (Jaccard similarity >= `threshold`) — the same `stack`
 * field `TagList` already renders on every work card, not a new field
 * invented for this graph. Purely structural (slugs, tags, similarity) —
 * deliberately has no opinion on labels, colors, or layout; those belong
 * to the rendering layer (`shared/ui/project-graph`), which has access to
 * `pick()`/i18n and design tokens that this plain-data module shouldn't
 * need to import just to stay testable without React.
 */
export function computeProjectGraph(items: WorkSummary[], threshold: number = DEFAULT_SIMILARITY_THRESHOLD): WorkGraph {
    const edges: WorkGraphEdge[] = [];
    const connectionCounts = new Map<string, number>(items.map((item) => [item.slug, 0]));

    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            const similarity = computeTagSimilarity(items[i].stack, items[j].stack);
            if (similarity < threshold) continue;

            edges.push({
                key: `${items[i].slug}::${items[j].slug}`,
                sourceSlug: items[i].slug,
                targetSlug: items[j].slug,
                similarity,
            });
            connectionCounts.set(items[i].slug, (connectionCounts.get(items[i].slug) ?? 0) + 1);
            connectionCounts.set(items[j].slug, (connectionCounts.get(items[j].slug) ?? 0) + 1);
        }
    }

    const nodes: WorkGraphNode[] = items.map((item) => ({
        slug: item.slug,
        tags: item.stack,
        connectionCount: connectionCounts.get(item.slug) ?? 0,
    }));

    return { nodes, edges };
}
