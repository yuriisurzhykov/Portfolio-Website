import { describe, expect, it } from "vitest";
import type { ContentChange } from "@portfolio/backend";
import { indexNowUrlsFor } from "./index-now-urls";

const SITE = "https://example.com";

function change(overrides: Partial<ContentChange> = {}): ContentChange {
    return {
        kind: "post",
        slug: "flowbus",
        previousSlug: null,
        isPublic: true,
        availableLocales: ["en"],
        ...overrides,
    };
}

describe("indexNowUrlsFor", () => {
    it("maps a post to /journal and a work item to /work", () => {
        expect(indexNowUrlsFor(change(), SITE)).toEqual(["https://example.com/journal/flowbus"]);
        expect(indexNowUrlsFor(change({ kind: "work", slug: "nav" }), SITE)).toEqual([
            "https://example.com/work/nav",
        ]);
    });

    it("lists the Russian address separately — IndexNow has no notion of hreflang", () => {
        expect(indexNowUrlsFor(change({ availableLocales: ["en", "ru"] }), SITE)).toEqual([
            "https://example.com/journal/flowbus",
            "https://example.com/ru/journal/flowbus",
        ]);
    });

    it("submits the OLD address too on a rename — it now redirects, and that hop is what moves the signals", () => {
        expect(indexNowUrlsFor(change({ slug: "new", previousSlug: "old" }), SITE)).toEqual([
            "https://example.com/journal/new",
            "https://example.com/journal/old",
        ]);
    });

    it("does not invent a previous address when nothing was renamed", () => {
        expect(indexNowUrlsFor(change({ previousSlug: null }), SITE)).toHaveLength(1);
    });
});
