import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import {
    discardAllDraftHistory,
    discardDraft,
    getRevisionData,
    listRevisions,
    MAX_REVISIONS,
    readDraft,
    readDraftsFor,
    restoreRevisionToDraft,
    saveDraft,
    snapshotRevision,
} from "./content-draft";

beforeEach(async () => {
    await resetTestDatabase();
});

describe("readDraft / saveDraft", () => {
    it("returns null when no draft exists for this (kind, entityId)", async () => {
        expect(await readDraft("post", "some-id")).toBeNull();
    });

    it("round-trips whatever JSON shape is handed to it", async () => {
        await saveDraft("post", "post-1", { title: "Hello", blocks: [1, 2, 3] });

        expect(await readDraft("post", "post-1")).toEqual({ title: "Hello", blocks: [1, 2, 3] });
    });

    it("upserts — a second save for the SAME (kind, entityId) overwrites, never stacks a second row", async () => {
        await saveDraft("post", "post-1", { title: "First" });
        await saveDraft("post", "post-1", { title: "Second" });

        expect(await prisma.contentDraft.count()).toBe(1);
        expect(await readDraft("post", "post-1")).toEqual({ title: "Second" });
    });

    it("keeps drafts for different kinds independent, even with the same entityId", async () => {
        await saveDraft("post", "shared-id", { title: "Post draft" });
        await saveDraft("work", "shared-id", { title: "Work draft" });

        expect(await readDraft("post", "shared-id")).toEqual({ title: "Post draft" });
        expect(await readDraft("work", "shared-id")).toEqual({ title: "Work draft" });
    });
});

describe("discardDraft", () => {
    it("removes an existing draft", async () => {
        await saveDraft("post", "post-1", { title: "Draft" });

        await discardDraft("post", "post-1");

        expect(await readDraft("post", "post-1")).toBeNull();
    });

    it("is a no-op, not an error, when there was nothing to discard", async () => {
        await expect(discardDraft("post", "post-1")).resolves.toBeUndefined();
    });
});

describe("readDraftsFor", () => {
    it("returns an empty map for an empty entityIds list, without querying", async () => {
        expect(await readDraftsFor("post", [])).toEqual(new Map());
    });

    it("returns a map keyed by entityId, one query for every id at once", async () => {
        await saveDraft("post", "post-1", { title: "A" });
        await saveDraft("post", "post-2", { title: "B" });
        // Not in the requested id list — must not leak into the result.
        await saveDraft("post", "post-3", { title: "C" });

        const drafts = await readDraftsFor("post", ["post-1", "post-2"]);

        expect(drafts.get("post-1")).toEqual({ title: "A" });
        expect(drafts.get("post-2")).toEqual({ title: "B" });
        expect(drafts.has("post-3")).toBe(false);
    });

    it("only returns entries that actually have a draft — an id with none is simply absent, not mapped to null", async () => {
        await saveDraft("post", "post-1", { title: "A" });

        const drafts = await readDraftsFor("post", ["post-1", "post-2"]);

        expect(drafts.has("post-2")).toBe(false);
    });
});

describe("snapshotRevision / listRevisions / getRevisionData", () => {
    it("listRevisions is empty for an entity with no history", async () => {
        expect(await listRevisions("post", "post-1")).toEqual([]);
    });

    it("records a snapshot, retrievable by its listed id", async () => {
        await snapshotRevision("post", "post-1", { title: "v1" }, new Date("2026-01-01"));

        const [revision] = await listRevisions("post", "post-1");
        expect(await getRevisionData("post", "post-1", revision.id)).toEqual({ title: "v1" });
    });

    it("lists revisions newest (by createdAt) first", async () => {
        await snapshotRevision("post", "post-1", { title: "v1" }, new Date("2026-01-01"));
        await new Promise((resolve) => setTimeout(resolve, 5));
        await snapshotRevision("post", "post-1", { title: "v2" }, new Date("2026-02-01"));

        const revisions = await listRevisions("post", "post-1");
        expect(await getRevisionData("post", "post-1", revisions[0].id)).toEqual({ title: "v2" });
        expect(await getRevisionData("post", "post-1", revisions[1].id)).toEqual({ title: "v1" });
    });

    it("getRevisionData returns null for a revision id that belongs to a DIFFERENT entity — the (kind, entityId) filter is load-bearing, not just a convenience", async () => {
        await snapshotRevision("post", "post-1", { title: "v1" }, new Date());
        const [revision] = await listRevisions("post", "post-1");

        expect(await getRevisionData("post", "post-2", revision.id)).toBeNull();
        expect(await getRevisionData("work", "post-1", revision.id)).toBeNull();
    });

    it("prunes down to MAX_REVISIONS, keeping the newest ones and dropping the oldest", async () => {
        for (let i = 0; i < MAX_REVISIONS + 5; i++) {
            await snapshotRevision("post", "post-1", { title: `v${ i }` }, new Date(2026, 0, i + 1));
        }

        const revisions = await listRevisions("post", "post-1");
        expect(revisions).toHaveLength(MAX_REVISIONS);
        // Newest entry (`v${MAX_REVISIONS + 4}`) must have survived; the very
        // first one written (`v0`) must have been pruned away.
        expect(await getRevisionData("post", "post-1", revisions[0].id)).toEqual({ title: `v${ MAX_REVISIONS + 4 }` });
        const allTitles = await Promise.all(revisions.map((r) => getRevisionData("post", "post-1", r.id)));
        expect(allTitles).not.toContainEqual({ title: "v0" });
    });
});

describe("restoreRevisionToDraft", () => {
    it("returns null when the revision doesn't exist for this entity", async () => {
        expect(await restoreRevisionToDraft("post", "post-1", "not-a-real-id")).toBeNull();
    });

    it("copies the revision's content into a draft, WITHOUT publishing/touching anything else", async () => {
        await snapshotRevision("post", "post-1", { title: "v1" }, new Date());
        const [revision] = await listRevisions("post", "post-1");

        const restored = await restoreRevisionToDraft("post", "post-1", revision.id);

        expect(restored).toEqual({ title: "v1" });
        expect(await readDraft("post", "post-1")).toEqual({ title: "v1" });
    });

    it("overwrites whatever draft was already pending", async () => {
        await saveDraft("post", "post-1", { title: "unsaved work in progress" });
        await snapshotRevision("post", "post-1", { title: "v1" }, new Date());
        const [revision] = await listRevisions("post", "post-1");

        await restoreRevisionToDraft("post", "post-1", revision.id);

        expect(await readDraft("post", "post-1")).toEqual({ title: "v1" });
    });
});

describe("discardAllDraftHistory", () => {
    it("removes both the pending draft and every revision for an entity", async () => {
        await saveDraft("post", "post-1", { title: "pending" });
        await snapshotRevision("post", "post-1", { title: "v1" }, new Date());
        await snapshotRevision("post", "post-1", { title: "v2" }, new Date());

        await discardAllDraftHistory("post", "post-1");

        expect(await readDraft("post", "post-1")).toBeNull();
        expect(await listRevisions("post", "post-1")).toEqual([]);
    });

    it("never touches a DIFFERENT entity's draft/history", async () => {
        await saveDraft("post", "post-1", { title: "keep me" });
        await snapshotRevision("post", "post-1", { title: "v1" }, new Date());

        await discardAllDraftHistory("post", "post-2");

        expect(await readDraft("post", "post-1")).toEqual({ title: "keep me" });
        expect(await listRevisions("post", "post-1")).toHaveLength(1);
    });
});
