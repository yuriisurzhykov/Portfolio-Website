import { describe, expect, it } from "vitest";
import { generateUniqueSlug, slugSchema } from "./slug";

describe("slugSchema", () => {
    it("accepts a lowercase, hyphenated slug", () => {
        expect(slugSchema.safeParse("my-post-title").success).toBe(true);
    });

    it("rejects uppercase, spaces, or double hyphens", () => {
        expect(slugSchema.safeParse("My-Post").success).toBe(false);
        expect(slugSchema.safeParse("my post").success).toBe(false);
        expect(slugSchema.safeParse("my--post").success).toBe(false);
    });

    it("rejects an empty string", () => {
        expect(slugSchema.safeParse("").success).toBe(false);
    });
});

describe("generateUniqueSlug", () => {
    function isTakenAmong(taken: string[]) {
        return async (candidate: string) => taken.includes(candidate);
    }

    it("returns the plain slugified title when nothing collides", async () => {
        const slug = await generateUniqueSlug("Why I Built FlowBus", isTakenAmong([]));
        expect(slug).toBe("why-i-built-flowbus");
    });

    it("appends -2 on the first collision", async () => {
        const slug = await generateUniqueSlug("My Post", isTakenAmong(["my-post"]));
        expect(slug).toBe("my-post-2");
    });

    it("keeps incrementing the suffix until a free slug is found", async () => {
        const slug = await generateUniqueSlug("My Post", isTakenAmong(["my-post", "my-post-2", "my-post-3"]));
        expect(slug).toBe("my-post-4");
    });

    it("falls back to \"untitled\" (not an empty base) for a title with nothing sluggable", async () => {
        const slug = await generateUniqueSlug("!!!", isTakenAmong([]));
        expect(slug).toBe("untitled");
    });

    it("suffixes the \"untitled\" fallback on collision, rather than producing a bare numeric slug", async () => {
        const slug = await generateUniqueSlug("!!!", isTakenAmong(["untitled"]));
        expect(slug).toBe("untitled-2");
    });
});
