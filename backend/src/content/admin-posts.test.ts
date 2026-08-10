import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import { isSlugAlreadyExistsError } from "../errors";
import { isInvalidLifecycleTransitionError } from "./lifecycle";
import { getJournalEntries, getPostBySlug } from "./posts";
import { findCurrentSlug } from "./slug-history";
import {
    createPost,
    deletePost,
    discardPostDraft,
    getPostForAdmin,
    getPostPreview,
    getPostsForAdmin,
    getPostTranslationForAdmin,
    listPostRevisions,
    type PostInput,
    postDraftInputSchema,
    publishPost,
    restorePostRevision,
    savePostDraft,
    translatePost,
    type TranslatePostInput,
    unpublishPost,
} from "./admin-posts";

const basePostInput: PostInput = {
    slug: "test-post",
    title: "Test Post",
    category: "Notes",
    excerpt: "An excerpt.",
    status: "published",
    relatedWorkSlug: null,
    blocks: [{ type: "lead", text: "Lead." }],
};

const baseTranslationInput: TranslatePostInput = {
    title: "Тестовый пост",
    category: "Заметки",
    excerpt: "Отрывок.",
    blocks: [{ type: "lead", text: "Лид." }],
};

beforeEach(async () => {
    await resetTestDatabase();
});

describe("getPostForAdmin", () => {
    it("returns null for a slug that doesn't exist", async () => {
        expect(await getPostForAdmin("nope")).toBeNull();
    });

    it("returns blocks: [] (not null) for an upcoming stub with no body document — unlike the public getPostBySlug", async () => {
        await prisma.post.create({
            data: {
                slug: "stub", date: "2026-01-01", title: { en: "a", ru: "a" }, category: { en: "a", ru: "a" },
                readMins: 0, excerpt: { en: "a", ru: "a" }, status: "upcoming",
            },
        });

        const post = await getPostForAdmin("stub");
        expect(post).not.toBeNull();
        expect(post?.blocks).toEqual([]);
    });

    it("draftSlug equals the live slug and hasUnpublishedChanges is false when there's no draft", async () => {
        await createPost(basePostInput);

        const post = await getPostForAdmin("test-post");
        expect(post?.draftSlug).toBe("test-post");
        expect(post?.hasUnpublishedChanges).toBe(false);
    });
});

describe("createPost", () => {
    it("creates a post with a body document and its blocks", async () => {
        const created = await createPost(basePostInput);
        expect(created.slug).toBe("test-post");

        const post = await getPostForAdmin("test-post");
        expect(post?.blocks.map((b) => b.type)).toEqual(["lead"]);
    });

    it("creates a post with no blocks and no body document at all", async () => {
        await createPost({ ...basePostInput, status: "upcoming", blocks: [] });

        const row = await prisma.post.findUnique({ where: { slug: "test-post" } });
        expect(row?.bodyDocumentId).toBeNull();
    });

    it("rejects a duplicate slug with SlugAlreadyExistsError, without leaking a Document row", async () => {
        await createPost(basePostInput);

        await expect(createPost(basePostInput)).rejects.toSatisfy(isSlugAlreadyExistsError);

        // Exactly one Document (from the first, successful create) — the
        // second attempt's blocks must never have been written.
        expect(await prisma.document.count()).toBe(1);
    });

    it("defaults to lifecycleState DRAFT, invisible on the public site, regardless of the (public) status field", async () => {
        await createPost(basePostInput); // status: "published"

        const row = await prisma.post.findUnique({ where: { slug: "test-post" } });
        expect(row?.lifecycleState).toBe("DRAFT");
        expect(row?.publishedAt).toBeNull();
        expect(await getPostBySlug("test-post")).toBeNull();
    });

    it("creates no ContentDraft row — the initial create IS the content, nothing pending yet", async () => {
        await createPost(basePostInput);
        expect(await prisma.contentDraft.count()).toBe(0);
    });

    it("derives a slug from the title when none is given, appending -2 on collision", async () => {
        const { slug: _omit, ...withoutSlug } = basePostInput;
        await createPost(withoutSlug as PostInput);
        await createPost({ ...(withoutSlug as PostInput), title: "Test Post" });

        expect(await prisma.post.findUnique({ where: { slug: "test-post" } })).not.toBeNull();
        expect(await prisma.post.findUnique({ where: { slug: "test-post-2" } })).not.toBeNull();
    });

    it("accepts the soft draft contract with only a title — every other field defaults", async () => {
        // Parsed through the real schema, not an `as PostInput` cast — a
        // cast would skip Zod's `.default()`s entirely and silently pass
        // `undefined` straight to Prisma (found live: the first version of
        // this test did exactly that and failed with a confusing Prisma
        // "argument missing" error that had nothing to do with the actual
        // behavior being tested).
        const input = postDraftInputSchema.parse({ title: "Just a title" });
        const created = await createPost(input);

        expect(created.slug).toBe("just-a-title");
        expect(created.category.en).toBe("");
        expect(created.excerpt.en).toBe("");
        expect(created.status).toBe("published");
        expect(created.readMins).toBe(0);
    });
});

describe("savePostDraft", () => {
    it("returns null when the slug being edited doesn't exist", async () => {
        expect(await savePostDraft("nope", basePostInput)).toBeNull();
    });

    it("NEVER touches the live Post row — the whole point of the draft/publish split", async () => {
        await createPost(basePostInput);
        const before = await prisma.post.findUnique({ where: { slug: "test-post" } });

        await savePostDraft("test-post", {
            ...basePostInput,
            title: "A Completely Different Title",
            blocks: [{ type: "heading", text: "H" }, { type: "paragraph", text: "P" }],
        });

        // The row itself, and the Document/Block rows it points at, are
        // byte-for-byte unchanged — a draft edit must not even create/
        // replace them.
        const after = await prisma.post.findUnique({ where: { slug: "test-post" } });
        expect(after).toEqual(before);
        const liveBlocks = await prisma.block.findMany({ where: { documentId: before!.bodyDocumentId! } });
        expect(liveBlocks.map((b) => b.type)).toEqual(["lead"]);
        // `getPostForAdmin`, by contrast, is EXPECTED to show the draft's
        // content — that's the merge this whole test would be pointless
        // without also asserting.
        const post = await getPostForAdmin("test-post");
        expect(post?.blocks.map((b) => b.type)).toEqual(["heading", "paragraph"]);
    });

    it("upserts exactly one ContentDraft row per post, regardless of how many times it's called", async () => {
        await createPost(basePostInput);

        await savePostDraft("test-post", { ...basePostInput, excerpt: "First edit." });
        await savePostDraft("test-post", { ...basePostInput, excerpt: "Second edit." });

        expect(await prisma.contentDraft.count()).toBe(1);
    });

    it("makes hasUnpublishedChanges true and the draft content visible via getPostForAdmin", async () => {
        await createPost(basePostInput);

        await savePostDraft("test-post", { ...basePostInput, title: "Draft Title", excerpt: "Draft excerpt." });

        const post = await getPostForAdmin("test-post");
        expect(post?.hasUnpublishedChanges).toBe(true);
        expect(post?.title.en).toBe("Draft Title");
        expect(post?.excerpt.en).toBe("Draft excerpt.");
    });

    it("never rejects a soft-shaped save even when required publish fields are blanked out", async () => {
        await createPost(basePostInput);
        const updated = await savePostDraft("test-post", { ...basePostInput, category: "", excerpt: "" });

        expect(updated).not.toBeNull();
        expect(updated?.category.en).toBe("");
    });

    it("does NOT auto-unpublish a PUBLISHED post even when the draft would fail the strict publish contract — the safety net is gone because a draft can no longer reach the live row at all", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");

        const updated = await savePostDraft("test-post", { ...basePostInput, excerpt: "" });

        expect(updated?.lifecycleState).toBe("PUBLISHED");
        const row = await prisma.post.findUnique({ where: { slug: "test-post" } });
        expect(row?.lifecycleState).toBe("PUBLISHED");
    });

    it("a pending rename does not change the live slug — the returned summary still reports the OLD slug", async () => {
        await createPost(basePostInput);

        const result = await savePostDraft("test-post", { ...basePostInput, slug: "renamed-post" });

        expect(result?.slug).toBe("test-post");
        expect(await prisma.post.findUnique({ where: { slug: "renamed-post" } })).toBeNull();
        const post = await getPostForAdmin("test-post");
        expect(post?.draftSlug).toBe("renamed-post");
    });

    it("omitting slug on a LATER save keeps the pending rename — a naive object spread would silently lose it", async () => {
        await createPost(basePostInput);
        await savePostDraft("test-post", { ...basePostInput, slug: "renamed-post" });

        // No `slug` in this second save's input at all — the soft schema's
        // normal shape when the admin hasn't touched the Slug field again.
        const { slug: _omit, ...withoutSlug } = basePostInput;
        await savePostDraft("test-post", { ...(withoutSlug as PostInput), excerpt: "Another edit." });

        const post = await getPostForAdmin("test-post");
        expect(post?.draftSlug).toBe("renamed-post");
    });

    it("preserves a pending translation across an English-only save", async () => {
        await createPost(basePostInput);
        await translatePost("test-post", baseTranslationInput);

        await savePostDraft("test-post", { ...basePostInput, excerpt: "Edited English." });

        const translation = await getPostTranslationForAdmin("test-post");
        expect(translation?.title.ru).toBe("Тестовый пост");
    });
});

describe("getPostsForAdmin", () => {
    it("returns both DRAFT and PUBLISHED posts, unlike the public getJournalEntries", async () => {
        await createPost(basePostInput);
        await createPost({ ...basePostInput, slug: "other" });
        await publishPost("other");

        const all = await getPostsForAdmin();
        expect(all.map((p) => p.slug).sort()).toEqual(["other", "test-post"]);
        expect(await getJournalEntries()).toHaveLength(1);
    });

    it("flags hasUnpublishedChanges per row and shows the DRAFT title, not the stale live one", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        await savePostDraft("test-post", { ...basePostInput, title: "Pending Title" });

        const all = await getPostsForAdmin();
        const row = all.find((p) => p.slug === "test-post");
        expect(row?.hasUnpublishedChanges).toBe(true);
        expect(row?.title.en).toBe("Pending Title");
    });
});

describe("publishPost", () => {
    it("returns null when the slug doesn't exist", async () => {
        expect(await publishPost("nope")).toBeNull();
    });

    it("moves a DRAFT post to PUBLISHED, sets publishedAt, and makes it visible publicly", async () => {
        await createPost(basePostInput);

        const published = await publishPost("test-post");
        expect(published?.lifecycleState).toBe("PUBLISHED");
        expect(published?.publishedAt).not.toBeNull();
        expect(await getPostBySlug("test-post")).not.toBeNull();
    });

    it("is idempotent — publishing an already-PUBLISHED post with no pending draft succeeds and keeps the original publishedAt", async () => {
        await createPost(basePostInput);
        const first = await publishPost("test-post");

        const second = await publishPost("test-post");
        expect(second?.lifecycleState).toBe("PUBLISHED");
        expect(second?.publishedAt).toBe(first?.publishedAt);
    });

    it("applies a pending draft's content to the live row — the whole reason a draft/publish split exists", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        await savePostDraft("test-post", { ...basePostInput, title: "New Title", blocks: [{ type: "paragraph", text: "New body." }] });

        await publishPost("test-post");

        const post = await getPostBySlug("test-post");
        expect(post?.title.en).toBe("New Title");
        expect(post?.body.map((b) => b.type)).toEqual(["paragraph"]);
    });

    it("discards the draft once it's applied — Publish/Update leaves nothing pending behind", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        await savePostDraft("test-post", { ...basePostInput, excerpt: "Edited." });

        await publishPost("test-post");

        expect(await prisma.contentDraft.count()).toBe(0);
        const post = await getPostForAdmin("test-post");
        expect(post?.hasUnpublishedChanges).toBe(false);
    });

    it("rejects publishing a post missing a required field (excerpt), listing what's missing — and leaves the draft AND the live row untouched", async () => {
        await createPost({ ...basePostInput, excerpt: "" });

        await expect(publishPost("test-post")).rejects.toMatchObject({ issues: expect.any(Array) });
        expect(await getPostBySlug("test-post")).toBeNull();
    });

    it("validates the DRAFT's pending content, not the stale live content, when the draft would fail publish", async () => {
        await createPost(basePostInput); // valid, publishable
        await publishPost("test-post");
        await savePostDraft("test-post", { ...basePostInput, excerpt: "" }); // draft now invalid

        await expect(publishPost("test-post")).rejects.toMatchObject({ issues: expect.any(Array) });
        // The live row must still show the OLD (still-valid) content — a
        // rejected publish must never leave the site half-updated.
        const post = await getPostBySlug("test-post");
        expect(post?.excerpt.en).toBe("An excerpt.");
        // And the invalid draft is still there for the admin to fix, not
        // silently discarded by the failed attempt.
        expect((await getPostForAdmin("test-post"))?.hasUnpublishedChanges).toBe(true);
    });

    it("is a genuine no-op when already PUBLISHED with no pending draft — no Document rewrite, no contentUpdatedAt bump, no revision snapshot", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        const before = await prisma.post.findUnique({ where: { slug: "test-post" } });

        await publishPost("test-post");

        const after = await prisma.post.findUnique({ where: { slug: "test-post" } });
        expect(after).toEqual(before);
        expect(await prisma.contentRevision.count()).toBe(0);
    });

    it("snapshots the PREVIOUS live content as a ContentRevision only when a draft is actually applied to an already-published post", async () => {
        await createPost(basePostInput);
        await publishPost("test-post"); // first publish — nothing to snapshot yet
        await savePostDraft("test-post", { ...basePostInput, excerpt: "Second version." });

        await publishPost("test-post");

        const revisions = await listPostRevisions("test-post");
        expect(revisions).toHaveLength(1);
    });

    it("never snapshots on the very first publish — there is nothing live yet to preserve", async () => {
        await createPost(basePostInput);

        await publishPost("test-post");

        expect(await prisma.contentRevision.count()).toBe(0);
    });

    it("applies a pending rename to the live slug and records SlugHistory — only at publish time, never at draft-save time", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        await savePostDraft("test-post", { ...basePostInput, slug: "renamed-post" });
        expect(await findCurrentSlug("post", "test-post")).toBeNull(); // not yet — still just a draft

        const published = await publishPost("test-post");

        expect(published?.slug).toBe("renamed-post");
        expect(await findCurrentSlug("post", "test-post")).toBe("renamed-post");
    });

    it("applies a pending translation together with the English content", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        await translatePost("test-post", baseTranslationInput);

        await publishPost("test-post");

        const post = await getPostBySlug("test-post", "ru");
        expect(post?.title.ru).toBe("Тестовый пост");
        expect(post?.body.map((b) => b.type)).toEqual(["lead"]);
    });

    it("recomputes readMins from the draft's blocks, not the stale live ones", async () => {
        await createPost(basePostInput); // "Lead." — a couple of words
        await publishPost("test-post");

        const manyWords = Array.from({ length: 600 }, (_, i) => `word${ i }`).join(" ");
        await savePostDraft("test-post", { ...basePostInput, blocks: [{ type: "paragraph", text: manyWords }] });
        const published = await publishPost("test-post");

        expect(published?.readMins).toBe(3); // 600 words / 200 wpm
    });
});

describe("unpublishPost", () => {
    it("returns null when the slug doesn't exist", async () => {
        expect(await unpublishPost("nope")).toBeNull();
    });

    it("moves a PUBLISHED post back to DRAFT, hiding it from the public site, without clearing publishedAt", async () => {
        await createPost(basePostInput);
        const published = await publishPost("test-post");

        const unpublished = await unpublishPost("test-post");
        expect(unpublished?.lifecycleState).toBe("DRAFT");
        expect(unpublished?.publishedAt).toBe(published?.publishedAt);
        expect(await getPostBySlug("test-post")).toBeNull();
    });

    it("throws InvalidLifecycleTransitionError when the post is already DRAFT", async () => {
        await createPost(basePostInput);
        await expect(unpublishPost("test-post")).rejects.toSatisfy(isInvalidLifecycleTransitionError);
    });

    it("never touches a pending draft — unpublishing hides live content, it isn't an editing action", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        await savePostDraft("test-post", { ...basePostInput, excerpt: "Pending edit." });

        await unpublishPost("test-post");

        expect((await getPostForAdmin("test-post"))?.hasUnpublishedChanges).toBe(true);
    });
});

describe("discardPostDraft", () => {
    it("returns null when the slug doesn't exist", async () => {
        expect(await discardPostDraft("nope")).toBeNull();
    });

    it("removes the pending draft and reverts the admin view back to the live content", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        await savePostDraft("test-post", { ...basePostInput, title: "Pending Title" });

        const reverted = await discardPostDraft("test-post");

        expect(reverted?.title.en).toBe("Test Post");
        expect(reverted?.hasUnpublishedChanges).toBe(false);
        expect(await prisma.contentDraft.count()).toBe(0);
    });

    it("is a no-op, not an error, when there was no draft to discard", async () => {
        await createPost(basePostInput);
        const result = await discardPostDraft("test-post");
        expect(result?.hasUnpublishedChanges).toBe(false);
    });
});

describe("listPostRevisions / restorePostRevision", () => {
    it("listPostRevisions returns null when the slug doesn't exist", async () => {
        expect(await listPostRevisions("nope")).toBeNull();
    });

    it("lists revisions newest first", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        await savePostDraft("test-post", { ...basePostInput, excerpt: "v2" });
        await publishPost("test-post");
        await savePostDraft("test-post", { ...basePostInput, excerpt: "v3" });
        await publishPost("test-post");

        const revisions = await listPostRevisions("test-post");
        expect(revisions).toHaveLength(2);
        expect(new Date(revisions![0].publishedAt).getTime()).toBeGreaterThanOrEqual(new Date(revisions![1].publishedAt).getTime());
    });

    it("restorePostRevision returns null for an unknown slug or an unrelated revision id", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        await savePostDraft("test-post", { ...basePostInput, excerpt: "v2" });
        await publishPost("test-post");
        const [revision] = (await listPostRevisions("test-post"))!;

        expect(await restorePostRevision("nope", revision.id)).toBeNull();
        expect(await restorePostRevision("test-post", "not-a-real-id")).toBeNull();
    });

    it("restoring a revision loads it into the draft WITHOUT touching the live row — a rollback still needs Publish/Update", async () => {
        await createPost(basePostInput); // excerpt: "An excerpt."
        await publishPost("test-post");
        await savePostDraft("test-post", { ...basePostInput, excerpt: "v2" });
        await publishPost("test-post"); // live excerpt is now "v2"; revision of "An excerpt." recorded
        const [revision] = (await listPostRevisions("test-post"))!;

        const restored = await restorePostRevision("test-post", revision.id);

        expect(restored?.excerpt.en).toBe("An excerpt.");
        expect((await getPostBySlug("test-post"))?.excerpt.en).toBe("v2"); // still live, untouched
        expect(restored?.hasUnpublishedChanges).toBe(true);
    });
});

describe("deletePost", () => {
    it("returns false for a slug that doesn't exist", async () => {
        expect(await deletePost("nope")).toBe(false);
    });

    it("deletes the post and its body Document/Blocks", async () => {
        await createPost(basePostInput);

        expect(await deletePost("test-post")).toBe(true);
        expect(await prisma.post.findUnique({ where: { slug: "test-post" } })).toBeNull();
        expect(await prisma.document.count()).toBe(0);
        expect(await prisma.block.count()).toBe(0);
    });

    it("also deletes the Russian translation Document, if one exists", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        await translatePost("test-post", baseTranslationInput);
        await publishPost("test-post");

        expect(await deletePost("test-post")).toBe(true);
        expect(await prisma.document.count()).toBe(0);
    });

    it("cleans up ContentDraft AND ContentRevision rows — no foreign key ties them to Post, so this is explicit", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        await savePostDraft("test-post", { ...basePostInput, excerpt: "v2" });
        await publishPost("test-post");
        await savePostDraft("test-post", { ...basePostInput, excerpt: "v3" }); // leaves one pending draft too

        await deletePost("test-post");

        expect(await prisma.contentDraft.count()).toBe(0);
        expect(await prisma.contentRevision.count()).toBe(0);
    });
});

describe("renaming keeps the old address resolvable", () => {
    it("publishPost records the former slug so it can redirect", async () => {
        // Without this, the IndexNow submission for the old slug sends a
        // crawler to a 404 — the URL is dropped instead of forwarded, and
        // every external link to it breaks.
        await createPost(basePostInput);
        await publishPost("test-post");

        await savePostDraft("test-post", { ...basePostInput, slug: "renamed-post" });
        await publishPost("test-post");

        expect(await findCurrentSlug("post", "test-post")).toBe("renamed-post");
    });

    it("records nothing on an ordinary publish that doesn't rename", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");

        await savePostDraft("test-post", { ...basePostInput, excerpt: "Edited." });
        await publishPost("test-post");

        expect(await findCurrentSlug("post", "test-post")).toBeNull();
    });

    it("a slug freed by a rename can be reused by a NEW post, and renamed away again without failing", async () => {
        // The reported bug, at the level it was reported. `createPost`'s
        // availability check only looks at live posts, so `test-post` is
        // free once A moves off it — but the `test-post → renamed-post`
        // history row was still there, and B's rename then hit the unique
        // constraint AFTER B's own update had committed: the API reported
        // failure for a rename that had actually happened, and retrying
        // with the old slug returned 404.
        await createPost(basePostInput);
        await savePostDraft("test-post", { ...basePostInput, slug: "renamed-post" });
        await publishPost("test-post");

        await createPost({ ...basePostInput, slug: "test-post", title: "Second Post" });
        await savePostDraft("test-post", { ...basePostInput, slug: "second-post" });
        await expect(publishPost("test-post")).resolves.not.toBeNull();

        // Last writer wins: whoever vacated the address most recently is
        // who a visitor following that old link most likely meant.
        expect(await findCurrentSlug("post", "test-post")).toBe("second-post");
        expect(await prisma.post.findUnique({ where: { slug: "second-post" } })).not.toBeNull();
    });

    it("creating a post at a freed slug drops the stale redirect immediately", async () => {
        // Otherwise the row lies dormant — the live post wins the lookup —
        // and revives the moment THAT post is deleted, pointing its address
        // at an unrelated post.
        await createPost(basePostInput);
        await savePostDraft("test-post", { ...basePostInput, slug: "renamed-post" });
        await publishPost("test-post");

        await createPost({ ...basePostInput, slug: "test-post", title: "Second Post" });

        expect(await findCurrentSlug("post", "test-post")).toBeNull();
    });

    it("deletePost forgets the entity's former addresses", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        await savePostDraft("test-post", { ...basePostInput, slug: "renamed-post" });
        await publishPost("test-post");

        await deletePost("renamed-post");

        expect(await findCurrentSlug("post", "test-post")).toBeNull();
    });
});

describe("claiming a reused slug — only after the write that reuses it actually succeeds", () => {
    it("createPost does not destroy an existing redirect if creation fails after the slug was found available", async () => {
        // "old-post" becomes a free slug with a redirect pointing at "new-post".
        await createPost({ ...basePostInput, slug: "old-post" });
        await publishPost("old-post");
        await savePostDraft("old-post", { ...basePostInput, slug: "new-post" });
        await publishPost("old-post");
        expect(await findCurrentSlug("post", "old-post")).toBe("new-post");

        // Force the actual insert to fail AFTER `assertSlugAvailable` already
        // said the slug was free — the exact window a naive "claim upfront"
        // implementation would have already destroyed the redirect in.
        const createSpy = vi.spyOn(prisma.post, "create").mockRejectedValueOnce(new Error("simulated failure"));
        await expect(createPost({ ...basePostInput, slug: "old-post", title: "Reused Slug" })).rejects.toThrow("simulated failure");
        createSpy.mockRestore();

        expect(await findCurrentSlug("post", "old-post")).toBe("new-post");
    });

    it("createPost claims the slug (destroying the stale redirect) once creation actually succeeds", async () => {
        await createPost({ ...basePostInput, slug: "old-post" });
        await publishPost("old-post");
        await savePostDraft("old-post", { ...basePostInput, slug: "new-post" });
        await publishPost("old-post");
        expect(await findCurrentSlug("post", "old-post")).toBe("new-post");

        await createPost({ ...basePostInput, slug: "old-post", title: "Reused Slug" });

        expect(await findCurrentSlug("post", "old-post")).toBeNull();
    });

    it("publishPost applying a rename claims the new slug, destroying any stale redirect it used to be", async () => {
        // "old-post" becomes a free slug redirecting to "new-post".
        await createPost({ ...basePostInput, slug: "old-post" });
        await publishPost("old-post");
        await savePostDraft("old-post", { ...basePostInput, slug: "new-post" });
        await publishPost("old-post");
        expect(await findCurrentSlug("post", "old-post")).toBe("new-post");

        // A second, unrelated post renames INTO "old-post".
        await createPost({ ...basePostInput, slug: "third-post" });
        await publishPost("third-post");
        await savePostDraft("third-post", { ...basePostInput, slug: "old-post" });
        await publishPost("third-post");

        expect(await findCurrentSlug("post", "old-post")).toBeNull();
        const post = await getPostBySlug("old-post");
        expect(post?.title.en).toBe("Test Post");
    });
});

describe("contentUpdatedAt — \"the content changed\", not \"the row was touched\"", () => {
    it("is not set by createPost — a brand new draft has never been modified", async () => {
        const created = await createPost(basePostInput);
        expect(created.contentUpdatedAt).toBeNull();
    });

    it("is NOT moved by savePostDraft — a pending draft edit hasn't reached readers yet", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");

        await savePostDraft("test-post", { ...basePostInput, excerpt: "Edited but not published." });

        expect((await getPostBySlug("test-post"))?.contentUpdatedAt).toBeNull();
    });

    it("survives a publish/unpublish/publish cycle untouched when nothing else changed", async () => {
        // The entire reason this column exists instead of reusing
        // `updatedAt`: all three of these calls move `@updatedAt` without a
        // character of the article changing. A mutant that adds
        // `contentUpdatedAt` to publish/unpublish's `data` has to die here,
        // or the column collapses back into `updatedAt` and `lastmod`
        // starts lying — which makes Google distrust it site-wide.
        await createPost(basePostInput);
        await savePostDraft("test-post", basePostInput);
        await publishPost("test-post");
        const afterFirstPublish = (await getPostForAdmin("test-post"))!.contentUpdatedAt;
        expect(afterFirstPublish).not.toBeNull();

        await unpublishPost("test-post");
        expect((await getPostForAdmin("test-post"))!.contentUpdatedAt).toBe(afterFirstPublish);

        // Re-publishing after an unpublish re-applies the SAME content with
        // no pending draft — must not look like a fresh content change.
        await publishPost("test-post");
        expect((await getPostForAdmin("test-post"))!.contentUpdatedAt).toBe(afterFirstPublish);
    });

    it("a first publish with NO draft ever having existed (created and published back-to-back) leaves contentUpdatedAt null", async () => {
        await createPost(basePostInput);

        await publishPost("test-post");

        expect((await getPostForAdmin("test-post"))!.contentUpdatedAt).toBeNull();
    });

    it("moves when a pending draft is actually applied via publishPost", async () => {
        await createPost(basePostInput);
        await savePostDraft("test-post", basePostInput); // a real draft, so the first publish itself sets a baseline timestamp
        await publishPost("test-post");
        const first = (await getPostForAdmin("test-post"))!.contentUpdatedAt;
        expect(first).not.toBeNull();

        await new Promise((resolve) => setTimeout(resolve, 5));
        await savePostDraft("test-post", { ...basePostInput, excerpt: "Edited." });
        await publishPost("test-post");

        const second = (await getPostForAdmin("test-post"))!.contentUpdatedAt;
        expect(second).not.toBe(first);
        expect(Date.parse(second!)).toBeGreaterThan(Date.parse(first!));
    });

    it("moves when a pending translation is applied via publishPost", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        expect((await getPostForAdmin("test-post"))!.contentUpdatedAt).toBeNull();

        await translatePost("test-post", baseTranslationInput);
        expect((await getPostForAdmin("test-post"))!.contentUpdatedAt).toBeNull(); // still pending, not applied yet

        await publishPost("test-post");
        expect((await getPostForAdmin("test-post"))!.contentUpdatedAt).not.toBeNull();
    });
});

describe("createPost — English-only, ru starts empty", () => {
    it("writes ru: \"\" on every localized metadata field", async () => {
        await createPost(basePostInput);

        const row = await prisma.post.findUnique({ where: { slug: "test-post" } });
        expect(row?.title).toEqual({ en: "Test Post", ru: "" });
        expect(row?.category).toEqual({ en: "Notes", ru: "" });
        expect(row?.excerpt).toEqual({ en: "An excerpt.", ru: "" });
    });
});

describe("createPost/publishPost — date is server-generated, never form input", () => {
    it("createPost sets date to today's date, regardless of what's in the input (there's no such field anymore)", async () => {
        const created = await createPost(basePostInput);
        expect(created.date).toBe(new Date().toISOString().slice(0, 10));
    });

    it("publishPost never changes the date a post was created with", async () => {
        const created = await createPost(basePostInput);
        await publishPost("test-post");
        await savePostDraft("test-post", { ...basePostInput, title: "Updated Title" });

        const published = await publishPost("test-post");

        expect(published?.date).toBe(created.date);
    });
});

describe("createPost/publishPost — readMins is derived from the body, never form input", () => {
    it("createPost estimates readMins from the blocks, ignoring any readMins-shaped field (there's no such field anymore)", async () => {
        const manyWords = Array.from({ length: 400 }, (_, i) => `word${ i }`).join(" ");
        const created = await createPost({ ...basePostInput, blocks: [{ type: "paragraph", text: manyWords }] });

        expect(created.readMins).toBe(2); // 400 words / 200 wpm
    });

    it("createPost gives a body-less upcoming stub readMins: 0", async () => {
        const created = await createPost({ ...basePostInput, status: "upcoming", blocks: [] });
        expect(created.readMins).toBe(0);
    });
});

describe("getPostForAdmin — readMins reflects the DRAFT's body, even before it's published", () => {
    it("shows the draft's estimated readMins, not the stale live value", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");

        const manyWords = Array.from({ length: 600 }, (_, i) => `word${ i }`).join(" ");
        await savePostDraft("test-post", { ...basePostInput, blocks: [{ type: "paragraph", text: manyWords }] });

        expect((await getPostForAdmin("test-post"))?.readMins).toBe(3); // 600 words / 200 wpm
        // The LIVE row's own column hasn't moved yet — only publishing does
        // that. Still 1, not 0 — `estimateReadMins` for "Lead." (a single
        // word) is `Math.max(1, round(1 / 200))`, set once at `createPost`.
        const row = await prisma.post.findUnique({ where: { slug: "test-post" } });
        expect(row?.readMins).toBe(1);
    });
});

describe("getPostTranslationForAdmin", () => {
    it("returns null for a slug that doesn't exist", async () => {
        expect(await getPostTranslationForAdmin("nope")).toBeNull();
    });

    it("returns blocks: [] and empty ru strings for a post with no translation (pending or live) yet", async () => {
        await createPost(basePostInput);

        const translation = await getPostTranslationForAdmin("test-post");
        expect(translation?.title).toEqual({ en: "Test Post", ru: "" });
        expect(translation?.blocks).toEqual([]);
    });

    it("shows the DRAFT's English content as the reference, not the stale live one", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        await savePostDraft("test-post", { ...basePostInput, title: "Pending English Title" });

        const translation = await getPostTranslationForAdmin("test-post");
        expect(translation?.title.en).toBe("Pending English Title");
    });
});

describe("translatePost", () => {
    it("returns null when the slug doesn't exist", async () => {
        expect(await translatePost("nope", baseTranslationInput)).toBeNull();
    });

    it("writes the pending translation into the draft — the LIVE row's Russian fields are untouched until publish", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");

        await translatePost("test-post", baseTranslationInput);

        const row = await prisma.post.findUnique({ where: { slug: "test-post" } });
        expect(row?.title).toEqual({ en: "Test Post", ru: "" });

        const translation = await getPostTranslationForAdmin("test-post");
        expect(translation?.title.ru).toBe("Тестовый пост");
    });

    it("creates an independent Russian body Document only once published, leaving the English one untouched", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        const before = await prisma.post.findUnique({ where: { slug: "test-post" } });

        await translatePost("test-post", baseTranslationInput);
        expect((await prisma.post.findUnique({ where: { slug: "test-post" } }))?.bodyDocumentIdRu).toBeNull();

        await publishPost("test-post");

        const after = await prisma.post.findUnique({ where: { slug: "test-post" } });
        expect(after?.bodyDocumentId).toBe(before?.bodyDocumentId);
        expect(after?.bodyDocumentIdRu).not.toBeNull();
        expect(after?.bodyDocumentIdRu).not.toBe(after?.bodyDocumentId);

        const translation = await getPostTranslationForAdmin("test-post");
        expect(translation?.blocks.map((b) => b.type)).toEqual(["lead"]);
    });

    it("a subsequent English-only savePostDraft + publish does not wipe out an already-live Russian translation", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        await translatePost("test-post", baseTranslationInput);
        await publishPost("test-post");

        await savePostDraft("test-post", { ...basePostInput, title: "Updated Title" });
        await publishPost("test-post");

        const row = await prisma.post.findUnique({ where: { slug: "test-post" } });
        expect(row?.title).toEqual({ en: "Updated Title", ru: "Тестовый пост" });
    });
});

describe("getPostPreview", () => {
    it("returns null when the slug doesn't exist", async () => {
        expect(await getPostPreview("nope")).toBeNull();
    });

    it("previews a never-published DRAFT post — unlike the public getPostBySlug", async () => {
        await createPost(basePostInput);

        const preview = await getPostPreview("test-post");
        expect(preview?.title.en).toBe("Test Post");
        expect(preview?.body.map((b) => b.type)).toEqual(["lead"]);
    });

    it("shows the PENDING draft's content, not the stale live content, for an already-published post", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        await savePostDraft("test-post", { ...basePostInput, title: "Unpublished Rewrite" });

        const preview = await getPostPreview("test-post");
        expect(preview?.title.en).toBe("Unpublished Rewrite");
        // The real public read is still the OLD title — proves the preview
        // and the live site are genuinely showing different things.
        expect((await getPostBySlug("test-post"))?.title.en).toBe("Test Post");
    });

    it("falls back to the English body for a Russian preview when no translation exists yet", async () => {
        await createPost(basePostInput);

        const preview = await getPostPreview("test-post", "ru");
        expect(preview?.body.map((b) => b.type)).toEqual(["lead"]);
    });

    it("shows the pending Russian translation when previewing in Russian", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");
        await translatePost("test-post", baseTranslationInput);

        const preview = await getPostPreview("test-post", "ru");
        expect(preview?.title.ru).toBe("Тестовый пост");
    });
});
