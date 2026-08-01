import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import { getDistinctPostCategories, getJournalEntries, getLatestPublishedPost, getPostBySlug } from "./posts";

async function makeDocument(blocks: { type: string; text?: string; data?: object }[]) {
    const document = await prisma.document.create({ data: {} });
    await prisma.block.createMany({
        data: blocks.map((b, i) => ({ documentId: document.id, order: i, type: b.type, text: b.text, data: b.data })),
    });
    return document.id;
}

beforeEach(async () => {
    await resetTestDatabase();
});

describe("getJournalEntries", () => {
    it("includes both published and upcoming posts, newest first", async () => {
        await prisma.post.create({
            data: {
                slug: "older", date: "2026-01-01", title: { en: "a", ru: "a" }, category: { en: "a", ru: "a" },
                readMins: 1, excerpt: { en: "a", ru: "a" }, status: "published", lifecycleState: "PUBLISHED",
            },
        });
        await prisma.post.create({
            data: {
                slug: "upcoming-draft", date: "2026-02-01", title: { en: "b", ru: "b" }, category: { en: "b", ru: "b" },
                readMins: 0, excerpt: { en: "b", ru: "b" }, status: "upcoming", lifecycleState: "PUBLISHED",
            },
        });

        const entries = await getJournalEntries();
        expect(entries.map((e) => e.slug)).toEqual(["upcoming-draft", "older"]);
    });

    it("excludes a DRAFT (lifecycleState) post entirely, even though it'd otherwise sort first", async () => {
        await prisma.post.create({
            data: {
                slug: "published", date: "2026-01-01", title: { en: "a", ru: "a" }, category: { en: "a", ru: "a" },
                readMins: 1, excerpt: { en: "a", ru: "a" }, status: "published", lifecycleState: "PUBLISHED",
            },
        });
        await prisma.post.create({
            data: {
                slug: "draft", date: "2026-02-01", title: { en: "b", ru: "b" }, category: { en: "b", ru: "b" },
                readMins: 0, excerpt: { en: "b", ru: "b" }, status: "published", lifecycleState: "DRAFT",
            },
        });

        const entries = await getJournalEntries();
        expect(entries.map((e) => e.slug)).toEqual(["published"]);
    });

    it("surfaces lifecycleState and publishedAt on the returned summary", async () => {
        const publishedAt = new Date("2026-01-15T00:00:00.000Z");
        await prisma.post.create({
            data: {
                slug: "a", date: "2026-01-01", title: { en: "a", ru: "a" }, category: { en: "a", ru: "a" },
                readMins: 1, excerpt: { en: "a", ru: "a" }, status: "published", lifecycleState: "PUBLISHED", publishedAt,
            },
        });

        const [entry] = await getJournalEntries();
        expect(entry.lifecycleState).toBe("PUBLISHED");
        expect(entry.publishedAt).toBe(publishedAt.toISOString());
    });
});

describe("getLatestPublishedPost", () => {
    it("skips upcoming posts even if they're newer", async () => {
        await prisma.post.create({
            data: {
                slug: "published-older", date: "2026-01-01", title: { en: "a", ru: "a" }, category: { en: "a", ru: "a" },
                readMins: 1, excerpt: { en: "a", ru: "a" }, status: "published", lifecycleState: "PUBLISHED",
            },
        });
        await prisma.post.create({
            data: {
                slug: "upcoming-newer", date: "2026-02-01", title: { en: "b", ru: "b" }, category: { en: "b", ru: "b" },
                readMins: 0, excerpt: { en: "b", ru: "b" }, status: "upcoming", lifecycleState: "PUBLISHED",
            },
        });

        const latest = await getLatestPublishedPost();
        expect(latest?.slug).toBe("published-older");
    });

    it("skips a DRAFT post even though its status is \"published\"", async () => {
        await prisma.post.create({
            data: {
                slug: "draft-published-status", date: "2026-02-01", title: { en: "b", ru: "b" }, category: { en: "b", ru: "b" },
                readMins: 0, excerpt: { en: "b", ru: "b" }, status: "published", lifecycleState: "DRAFT",
            },
        });

        expect(await getLatestPublishedPost()).toBeNull();
    });

    it("returns null when there are no published posts at all", async () => {
        expect(await getLatestPublishedPost()).toBeNull();
    });
});

describe("getPostBySlug", () => {
    it("returns the post with its parsed English body blocks by default", async () => {
        const bodyDocumentId = await makeDocument([
            { type: "lead", text: "Lead" },
            { type: "paragraph", text: "Para" },
        ]);
        await prisma.post.create({
            data: {
                slug: "with-body", date: "2026-01-01", title: { en: "a", ru: "a" }, category: { en: "a", ru: "a" },
                readMins: 1, excerpt: { en: "a", ru: "a" }, status: "published", lifecycleState: "PUBLISHED", bodyDocumentId,
            },
        });

        const post = await getPostBySlug("with-body");
        expect(post?.body?.map((b) => b.type)).toEqual(["lead", "paragraph"]);
    });

    it("returns null for a slug that doesn't exist", async () => {
        expect(await getPostBySlug("does-not-exist")).toBeNull();
    });

    it("returns null for an upcoming stub with no body document", async () => {
        await prisma.post.create({
            data: {
                slug: "no-body-yet", date: "2026-01-01", title: { en: "a", ru: "a" }, category: { en: "a", ru: "a" },
                readMins: 0, excerpt: { en: "a", ru: "a" }, status: "upcoming", lifecycleState: "PUBLISHED",
            },
        });

        expect(await getPostBySlug("no-body-yet")).toBeNull();
    });

    it("returns null for a DRAFT post's slug, same as an unknown one — the lifecycle check runs before the body/status logic", async () => {
        const bodyDocumentId = await makeDocument([{ type: "paragraph", text: "Body" }]);
        await prisma.post.create({
            data: {
                slug: "draft-with-body", date: "2026-01-01", title: { en: "a", ru: "a" }, category: { en: "a", ru: "a" },
                readMins: 1, excerpt: { en: "a", ru: "a" }, status: "published", lifecycleState: "DRAFT", bodyDocumentId,
            },
        });

        expect(await getPostBySlug("draft-with-body")).toBeNull();
    });

    it("locale=\"ru\" reads the Russian body Document when one exists", async () => {
        const bodyDocumentId = await makeDocument([{ type: "paragraph", text: "English para" }]);
        const bodyDocumentIdRu = await makeDocument([{ type: "paragraph", text: "Русский абзац" }]);
        await prisma.post.create({
            data: {
                slug: "translated", date: "2026-01-01", title: { en: "a", ru: "a" }, category: { en: "a", ru: "a" },
                readMins: 1, excerpt: { en: "a", ru: "a" }, status: "published", lifecycleState: "PUBLISHED", bodyDocumentId, bodyDocumentIdRu,
            },
        });

        const en = await getPostBySlug("translated", "en");
        const ru = await getPostBySlug("translated", "ru");
        expect(en?.body[0]).toMatchObject({ text: "English para" });
        expect(ru?.body[0]).toMatchObject({ text: "Русский абзац" });
    });

    it("locale=\"ru\" silently falls back to the English body when no translation exists yet", async () => {
        const bodyDocumentId = await makeDocument([{ type: "paragraph", text: "English only" }]);
        await prisma.post.create({
            data: {
                slug: "untranslated", date: "2026-01-01", title: { en: "a", ru: "a" }, category: { en: "a", ru: "a" },
                readMins: 1, excerpt: { en: "a", ru: "a" }, status: "published", lifecycleState: "PUBLISHED", bodyDocumentId,
            },
        });

        const ru = await getPostBySlug("untranslated", "ru");
        expect(ru?.body[0]).toMatchObject({ text: "English only" });
    });
});

describe("getDistinctPostCategories", () => {
    it("returns every distinct English category, alphabetically, with no duplicates", async () => {
        await prisma.post.create({
            data: {
                slug: "a", date: "2026-01-01", title: { en: "a", ru: "" }, category: { en: "Process", ru: "" },
                readMins: 1, excerpt: { en: "a", ru: "" }, status: "published",
            },
        });
        await prisma.post.create({
            data: {
                slug: "b", date: "2026-01-02", title: { en: "b", ru: "" }, category: { en: "Architecture", ru: "" },
                readMins: 1, excerpt: { en: "b", ru: "" }, status: "published",
            },
        });
        await prisma.post.create({
            data: {
                slug: "c", date: "2026-01-03", title: { en: "c", ru: "" }, category: { en: "Process", ru: "" },
                readMins: 1, excerpt: { en: "c", ru: "" }, status: "published",
            },
        });

        expect(await getDistinctPostCategories()).toEqual(["Architecture", "Process"]);
    });

    it("returns [] when there are no posts at all", async () => {
        expect(await getDistinctPostCategories()).toEqual([]);
    });

    it("includes categories from DRAFT posts too — this admin-facing helper isn't filtered by lifecycleState", async () => {
        await prisma.post.create({
            data: {
                slug: "draft", date: "2026-01-01", title: { en: "a", ru: "" }, category: { en: "Drafts Only", ru: "" },
                readMins: 1, excerpt: { en: "a", ru: "" }, status: "published", lifecycleState: "DRAFT",
            },
        });

        expect(await getDistinctPostCategories()).toEqual(["Drafts Only"]);
    });
});
