import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import { findCurrentSlug, forgetSlugHistory, recordSlugChange } from "./slug-history";

beforeEach(async () => {
    await resetTestDatabase();
});

describe("recordSlugChange / findCurrentSlug", () => {
    it("makes the former slug resolve to the current one", async () => {
        await recordSlugChange("post", "old-name", "new-name");

        expect(await findCurrentSlug("post", "old-name")).toBe("new-name");
    });

    it("returns null for a slug that was never in use", async () => {
        expect(await findCurrentSlug("post", "never-existed")).toBeNull();
    });

    it("keeps post and work in separate namespaces", async () => {
        await recordSlugChange("post", "shared", "post-now");

        expect(await findCurrentSlug("post", "shared")).toBe("post-now");
        expect(await findCurrentSlug("work", "shared")).toBeNull();
    });

    it("records nothing when the slug didn't actually change", async () => {
        await recordSlugChange("post", "same", "same");

        expect(await prisma.slugHistory.count()).toBe(0);
    });

    it("FLATTENS a chain: a→b then b→c leaves a pointing straight at c", async () => {
        // A crawler loses signal at every hop of a redirect chain, and some
        // stop following after a few. Leaving `a → b → c` would also mean
        // the oldest address — the one with the most inbound links — is the
        // one paying the most hops.
        await recordSlugChange("post", "a", "b");
        await recordSlugChange("post", "b", "c");

        expect(await findCurrentSlug("post", "a")).toBe("c");
        expect(await findCurrentSlug("post", "b")).toBe("c");
    });

    it("does NOT leave a redirect loop when a slug is renamed back", async () => {
        // a→b then b→a. Without deleting the `a → b` row, the entity's own
        // live URL would redirect to its former one, which redirects back:
        // an infinite loop on a page that exists.
        await recordSlugChange("post", "a", "b");
        await recordSlugChange("post", "b", "a");

        expect(await findCurrentSlug("post", "a")).toBeNull();
        expect(await findCurrentSlug("post", "b")).toBe("a");
    });

    it("has one destination per former address, never two", async () => {
        await recordSlugChange("post", "a", "b");
        await recordSlugChange("post", "c", "b");
        await recordSlugChange("post", "b", "d");

        expect(await prisma.slugHistory.findMany({ where: { formerSlug: "a" } })).toHaveLength(1);
        expect(await findCurrentSlug("post", "a")).toBe("d");
        expect(await findCurrentSlug("post", "c")).toBe("d");
    });
});

describe("forgetSlugHistory", () => {
    it("drops every former address of a deleted entity", async () => {
        // A redirect to a slug that no longer exists is worse than the old
        // address 404ing directly — the crawler pays for a hop and lands on
        // the same nothing.
        await recordSlugChange("post", "a", "b");
        await recordSlugChange("post", "b", "c");

        await forgetSlugHistory("post", "c");

        expect(await findCurrentSlug("post", "a")).toBeNull();
        expect(await findCurrentSlug("post", "b")).toBeNull();
    });

    it("leaves another kind's history alone", async () => {
        await recordSlugChange("post", "a", "b");
        await recordSlugChange("work", "a", "b");

        await forgetSlugHistory("post", "b");

        expect(await findCurrentSlug("work", "a")).toBe("b");
    });
});
