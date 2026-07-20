import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import { getJournalEntries, getLatestPublishedPost, getPostBySlug } from "./posts";

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
                readMins: 1, excerpt: { en: "a", ru: "a" }, status: "published",
            },
        });
        await prisma.post.create({
            data: {
                slug: "upcoming-draft", date: "2026-02-01", title: { en: "b", ru: "b" }, category: { en: "b", ru: "b" },
                readMins: 0, excerpt: { en: "b", ru: "b" }, status: "upcoming",
            },
        });

        const entries = await getJournalEntries();
        expect(entries.map((e) => e.slug)).toEqual(["upcoming-draft", "older"]);
    });
});

describe("getLatestPublishedPost", () => {
    it("skips upcoming posts even if they're newer", async () => {
        await prisma.post.create({
            data: {
                slug: "published-older", date: "2026-01-01", title: { en: "a", ru: "a" }, category: { en: "a", ru: "a" },
                readMins: 1, excerpt: { en: "a", ru: "a" }, status: "published",
            },
        });
        await prisma.post.create({
            data: {
                slug: "upcoming-newer", date: "2026-02-01", title: { en: "b", ru: "b" }, category: { en: "b", ru: "b" },
                readMins: 0, excerpt: { en: "b", ru: "b" }, status: "upcoming",
            },
        });

        const latest = await getLatestPublishedPost();
        expect(latest?.slug).toBe("published-older");
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
                readMins: 1, excerpt: { en: "a", ru: "a" }, status: "published", bodyDocumentId,
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
                readMins: 0, excerpt: { en: "a", ru: "a" }, status: "upcoming",
            },
        });

        expect(await getPostBySlug("no-body-yet")).toBeNull();
    });

    it("locale=\"ru\" reads the Russian body Document when one exists", async () => {
        const bodyDocumentId = await makeDocument([{ type: "paragraph", text: "English para" }]);
        const bodyDocumentIdRu = await makeDocument([{ type: "paragraph", text: "Русский абзац" }]);
        await prisma.post.create({
            data: {
                slug: "translated", date: "2026-01-01", title: { en: "a", ru: "a" }, category: { en: "a", ru: "a" },
                readMins: 1, excerpt: { en: "a", ru: "a" }, status: "published", bodyDocumentId, bodyDocumentIdRu,
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
                readMins: 1, excerpt: { en: "a", ru: "a" }, status: "published", bodyDocumentId,
            },
        });

        const ru = await getPostBySlug("untranslated", "ru");
        expect(ru?.body[0]).toMatchObject({ text: "English only" });
    });
});
