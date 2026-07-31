import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import { isSlugAlreadyExistsError } from "../errors";
import { isInvalidLifecycleTransitionError } from "./lifecycle";
import { getJournalEntries, getPostBySlug } from "./posts";
import {
    createPost,
    deletePost,
    type PostInput,
    postDraftInputSchema,
    getPostForAdmin,
    getPostsForAdmin,
    getPostTranslationForAdmin,
    publishPost,
    translatePost,
    type TranslatePostInput,
    unpublishPost,
    updatePost,
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

describe("updatePost", () => {
    it("returns null when the slug being edited doesn't exist", async () => {
        expect(await updatePost("nope", basePostInput)).toBeNull();
    });

    it("replaces the body's blocks in place, reusing the same Document row", async () => {
        await createPost(basePostInput);
        const before = await prisma.post.findUnique({ where: { slug: "test-post" } });

        await updatePost("test-post", {
            ...basePostInput,
            blocks: [
                { type: "heading", text: "H" },
                { type: "paragraph", text: "P" },
            ],
        });

        const after = await prisma.post.findUnique({ where: { slug: "test-post" } });
        expect(after?.bodyDocumentId).toBe(before?.bodyDocumentId);

        const post = await getPostForAdmin("test-post");
        expect(post?.blocks.map((b) => b.type)).toEqual(["heading", "paragraph"]);
    });

    it("deletes the Document entirely when the blocks are cleared to empty", async () => {
        await createPost(basePostInput);
        await updatePost("test-post", { ...basePostInput, blocks: [] });

        const row = await prisma.post.findUnique({ where: { slug: "test-post" } });
        expect(row?.bodyDocumentId).toBeNull();
        expect(await prisma.document.count()).toBe(0);
    });

    it("creates a new Document when blocks are added to a post that had none", async () => {
        await createPost({ ...basePostInput, blocks: [] });
        await updatePost("test-post", { ...basePostInput, blocks: [{ type: "paragraph", text: "P" }] });

        const row = await prisma.post.findUnique({ where: { slug: "test-post" } });
        expect(row?.bodyDocumentId).not.toBeNull();
    });

    it("allows renaming the slug, and rejects renaming onto an existing one", async () => {
        await createPost(basePostInput);
        await createPost({ ...basePostInput, slug: "other-post" });

        const renamed = await updatePost("test-post", { ...basePostInput, slug: "renamed-post" });
        expect(renamed?.slug).toBe("renamed-post");

        await expect(updatePost("renamed-post", { ...basePostInput, slug: "other-post" }))
            .rejects.toSatisfy(isSlugAlreadyExistsError);
    });

    it("omitting slug keeps the current slug rather than regenerating one from the title", async () => {
        await createPost(basePostInput);
        const updated = await updatePost("test-post", { ...basePostInput, slug: undefined, title: "A Whole New Title" });

        expect(updated?.slug).toBe("test-post");
    });

    it("never rejects a soft-shaped save even when required publish fields are blanked out", async () => {
        await createPost(basePostInput);
        const updated = await updatePost("test-post", { ...basePostInput, category: "", excerpt: "" });

        expect(updated).not.toBeNull();
        expect(updated?.category.en).toBe("");
    });

    it("auto-unpublishes a PUBLISHED post whose update would fail the strict publish contract", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");

        const updated = await updatePost("test-post", { ...basePostInput, excerpt: "" });

        expect(updated?.lifecycleState).toBe("DRAFT");
        const row = await prisma.post.findUnique({ where: { slug: "test-post" } });
        expect(row?.lifecycleState).toBe("DRAFT");
    });

    it("leaves a PUBLISHED post published when the update still satisfies the strict publish contract", async () => {
        await createPost(basePostInput);
        await publishPost("test-post");

        const updated = await updatePost("test-post", { ...basePostInput, excerpt: "Still complete." });

        expect(updated?.lifecycleState).toBe("PUBLISHED");
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

    it("is idempotent — publishing an already-PUBLISHED post succeeds and keeps the original publishedAt", async () => {
        await createPost(basePostInput);
        const first = await publishPost("test-post");

        const second = await publishPost("test-post");
        expect(second?.lifecycleState).toBe("PUBLISHED");
        expect(second?.publishedAt).toBe(first?.publishedAt);
    });

    it("rejects publishing a post missing a required field (excerpt), listing what's missing", async () => {
        await createPost({ ...basePostInput, excerpt: "" });

        await expect(publishPost("test-post")).rejects.toMatchObject({ issues: expect.any(Array) });
        expect(await getPostBySlug("test-post")).toBeNull();
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
        await translatePost("test-post", baseTranslationInput);

        expect(await deletePost("test-post")).toBe(true);
        expect(await prisma.document.count()).toBe(0);
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

describe("createPost/updatePost — date is server-generated, never form input", () => {
    it("createPost sets date to today's date, regardless of what's in the input (there's no such field anymore)", async () => {
        const created = await createPost(basePostInput);
        expect(created.date).toBe(new Date().toISOString().slice(0, 10));
    });

    it("updatePost never changes the date a post was created with", async () => {
        const created = await createPost(basePostInput);

        const updated = await updatePost("test-post", { ...basePostInput, title: "Updated Title" });

        expect(updated?.date).toBe(created.date);
    });
});

describe("createPost/updatePost — readMins is derived from the body, never form input", () => {
    it("createPost estimates readMins from the blocks, ignoring any readMins-shaped field (there's no such field anymore)", async () => {
        const manyWords = Array.from({ length: 400 }, (_, i) => `word${ i }`).join(" ");
        const created = await createPost({ ...basePostInput, blocks: [{ type: "paragraph", text: manyWords }] });

        expect(created.readMins).toBe(2); // 400 words / 200 wpm
    });

    it("createPost gives a body-less upcoming stub readMins: 0", async () => {
        const created = await createPost({ ...basePostInput, status: "upcoming", blocks: [] });
        expect(created.readMins).toBe(0);
    });

    it("updatePost recomputes readMins from the NEW blocks, not the old ones", async () => {
        await createPost(basePostInput); // "Lead." — a couple of words, readMins 0 or 1

        const manyWords = Array.from({ length: 600 }, (_, i) => `word${ i }`).join(" ");
        const updated = await updatePost("test-post", { ...basePostInput, blocks: [{ type: "paragraph", text: manyWords }] });

        expect(updated?.readMins).toBe(3); // 600 words / 200 wpm
    });
});

describe("getPostTranslationForAdmin", () => {
    it("returns null for a slug that doesn't exist", async () => {
        expect(await getPostTranslationForAdmin("nope")).toBeNull();
    });

    it("returns blocks: [] and empty ru strings for a post with no translation yet", async () => {
        await createPost(basePostInput);

        const translation = await getPostTranslationForAdmin("test-post");
        expect(translation?.title).toEqual({ en: "Test Post", ru: "" });
        expect(translation?.blocks).toEqual([]);
    });
});

describe("translatePost", () => {
    it("returns null when the slug doesn't exist", async () => {
        expect(await translatePost("nope", baseTranslationInput)).toBeNull();
    });

    it("writes the Russian side of title/category/excerpt without touching English", async () => {
        await createPost(basePostInput);
        await translatePost("test-post", baseTranslationInput);

        const row = await prisma.post.findUnique({ where: { slug: "test-post" } });
        expect(row?.title).toEqual({ en: "Test Post", ru: "Тестовый пост" });
        expect(row?.category).toEqual({ en: "Notes", ru: "Заметки" });
        expect(row?.excerpt).toEqual({ en: "An excerpt.", ru: "Отрывок." });
    });

    it("creates an independent Russian body Document, leaving the English one untouched", async () => {
        await createPost(basePostInput);
        const before = await prisma.post.findUnique({ where: { slug: "test-post" } });

        await translatePost("test-post", baseTranslationInput);

        const after = await prisma.post.findUnique({ where: { slug: "test-post" } });
        expect(after?.bodyDocumentId).toBe(before?.bodyDocumentId);
        expect(after?.bodyDocumentIdRu).not.toBeNull();
        expect(after?.bodyDocumentIdRu).not.toBe(after?.bodyDocumentId);

        const translation = await getPostTranslationForAdmin("test-post");
        expect(translation?.blocks.map((b) => b.type)).toEqual(["lead"]);
    });

    it("a subsequent English-only updatePost does not wipe out the Russian translation", async () => {
        await createPost(basePostInput);
        await translatePost("test-post", baseTranslationInput);

        await updatePost("test-post", { ...basePostInput, title: "Updated Title" });

        const row = await prisma.post.findUnique({ where: { slug: "test-post" } });
        expect(row?.title).toEqual({ en: "Updated Title", ru: "Тестовый пост" });
    });
});
