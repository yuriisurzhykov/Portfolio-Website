import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import { isSlugAlreadyExistsError } from "../errors";
import { createPost, deletePost, getPostForAdmin, type PostInput, updatePost } from "./admin-posts";

const basePostInput: PostInput = {
    slug: "test-post",
    date: "2026-01-01",
    dateLabel: null,
    title: { en: "Test Post", ru: "Тестовый пост" },
    category: { en: "Notes", ru: "Заметки" },
    readMins: 3,
    excerpt: { en: "An excerpt.", ru: "Отрывок." },
    status: "published",
    relatedWorkSlug: null,
    blocks: [{ type: "lead", text: { en: "Lead.", ru: "Лид." } }],
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
                { type: "heading", text: { en: "H", ru: "З" } },
                { type: "paragraph", text: { en: "P", ru: "П" } },
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
        await updatePost("test-post", { ...basePostInput, blocks: [{ type: "paragraph", text: { en: "P", ru: "П" } }] });

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
});
