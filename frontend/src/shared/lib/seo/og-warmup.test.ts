import { afterEach, describe, expect, it, vi } from "vitest";
import type { ContentChange } from "@portfolio/backend";
import { createOgWarmupNotifier } from "./og-warmup";

vi.mock("./site-url", () => ({ SITE_URL: "https://example.com", IS_INDEXABLE: true }));

const PUBLISHED_POST: ContentChange = {
    kind: "post",
    slug: "my-post",
    previousSlug: null,
    isPublic: true,
    availableLocales: ["en", "ru"],
};

describe("createOgWarmupNotifier", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("primes the post OG-image route for every available locale", () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
        createOgWarmupNotifier(fetchImpl).contentChanged(PUBLISHED_POST);

        expect(fetchImpl).toHaveBeenCalledWith("https://example.com/journal/my-post/og-image/en");
        expect(fetchImpl).toHaveBeenCalledWith("https://example.com/journal/my-post/og-image/ru");
        expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it("primes the work OG-image route for a work item", () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
        createOgWarmupNotifier(fetchImpl).contentChanged({ ...PUBLISHED_POST, kind: "work", availableLocales: ["en"] });

        expect(fetchImpl).toHaveBeenCalledWith("https://example.com/work/my-post/og-image/en");
    });

    it("does nothing for an unpublish/delete (isPublic: false)", () => {
        const fetchImpl = vi.fn();
        createOgWarmupNotifier(fetchImpl).contentChanged({ ...PUBLISHED_POST, isPublic: false });

        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("does not let a fetch rejection escape the caller", async () => {
        const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
        expect(() => createOgWarmupNotifier(fetchImpl).contentChanged(PUBLISHED_POST)).not.toThrow();
        // Let the rejected promise's .catch() handler run before the test ends.
        await new Promise((resolve) => setTimeout(resolve, 0));
    });
});
