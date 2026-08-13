import { describe, expect, it } from "vitest";
import type { WorkSummary } from "@portfolio/backend";
import { computeProjectGraph, computeTagSimilarity } from "./computeProjectGraph";

let nextSlug = 0;
function buildWorkSummary(overrides: Partial<WorkSummary> & { stack: string[] }): WorkSummary {
    const slug = overrides.slug ?? `work-${nextSlug++}`;
    return {
        slug,
        title: { en: slug, ru: slug },
        date: "2026-01-01",
        status: "shipped",
        summary: { en: "", ru: "" },
        coverImage: null,
        featured: true,
        relatedPostSlug: null,
        cover: null,
        hasCaseStudy: false,
        lifecycleState: "PUBLISHED" as WorkSummary["lifecycleState"],
        publishedAt: null,
        contentUpdatedAt: null,
        availableLocales: ["en"],
        ...overrides,
    };
}

describe("computeTagSimilarity", () => {
    it("returns 1 for identical non-empty tag sets", () => {
        expect(computeTagSimilarity(["Kotlin", "C++/NDK"], ["Kotlin", "C++/NDK"])).toBe(1);
    });

    it("returns 0 for completely disjoint tag sets", () => {
        expect(computeTagSimilarity(["Kotlin"], ["Gradle"])).toBe(0);
    });

    it("returns 0 for two empty tag sets, not NaN from a 0/0 division", () => {
        expect(computeTagSimilarity([], [])).toBe(0);
    });

    it("is case-insensitive", () => {
        expect(computeTagSimilarity(["kotlin"], ["KOTLIN"])).toBe(1);
    });

    it("computes the actual Jaccard ratio for a partial overlap, not just a truthy/falsy signal", () => {
        // {kotlin, ndk, onvif} vs {kotlin, ndk, gradle} -> intersection 2, union 4
        expect(computeTagSimilarity(["Kotlin", "NDK", "ONVIF"], ["Kotlin", "NDK", "Gradle"])).toBe(0.5);
    });
});

describe("computeProjectGraph", () => {
    it("connects two items whose similarity meets the threshold exactly (boundary, not just clearly-above)", () => {
        const a = buildWorkSummary({ slug: "a", stack: ["Kotlin"] });
        const b = buildWorkSummary({ slug: "b", stack: ["Kotlin", "Gradle"] });
        // similarity = 1/2 = 0.5
        const { edges } = computeProjectGraph([a, b], 0.5);
        expect(edges).toHaveLength(1);
        expect(edges[0]).toMatchObject({ sourceSlug: "a", targetSlug: "b", similarity: 0.5 });
    });

    it("excludes an edge one step below the threshold, not just far below it", () => {
        const a = buildWorkSummary({ slug: "a", stack: ["Kotlin"] });
        const b = buildWorkSummary({ slug: "b", stack: ["Kotlin", "Gradle"] });
        const { edges } = computeProjectGraph([a, b], 0.51);
        expect(edges).toHaveLength(0);
    });

    it("never produces a self-loop for a single item", () => {
        const a = buildWorkSummary({ slug: "a", stack: ["Kotlin"] });
        const { nodes, edges } = computeProjectGraph([a], 0);
        expect(edges).toHaveLength(0);
        expect(nodes).toEqual([{ slug: "a", tags: ["Kotlin"], connectionCount: 0 }]);
    });

    it("counts connections per node, not just total edge count", () => {
        // hub shares a tag with each of the other two; the other two share nothing with each other.
        const hub = buildWorkSummary({ slug: "hub", stack: ["Kotlin", "Gradle", "ONVIF"] });
        const leafA = buildWorkSummary({ slug: "leafA", stack: ["Kotlin"] });
        const leafB = buildWorkSummary({ slug: "leafB", stack: ["Gradle"] });
        const { nodes, edges } = computeProjectGraph([hub, leafA, leafB], 0.1);

        expect(edges).toHaveLength(2);
        const byslug = new Map(nodes.map((n) => [n.slug, n.connectionCount]));
        expect(byslug.get("hub")).toBe(2);
        expect(byslug.get("leafA")).toBe(1);
        expect(byslug.get("leafB")).toBe(1);
    });

    it("returns every item as a node even with zero edges (isolated, not dropped)", () => {
        const a = buildWorkSummary({ slug: "a", stack: ["Kotlin"] });
        const b = buildWorkSummary({ slug: "b", stack: ["Rust"] });
        const { nodes, edges } = computeProjectGraph([a, b]);
        expect(nodes).toHaveLength(2);
        expect(edges).toHaveLength(0);
    });

    it("uses the default threshold when none is passed", () => {
        const a = buildWorkSummary({ slug: "a", stack: ["Kotlin", "Gradle", "ONVIF", "NDK"] });
        const b = buildWorkSummary({ slug: "b", stack: ["Kotlin", "Rust", "Swift", "Go"] });
        // similarity = 1/7 ≈ 0.143, below the documented 0.15 default.
        const { edges } = computeProjectGraph([a, b]);
        expect(edges).toHaveLength(0);
    });
});
