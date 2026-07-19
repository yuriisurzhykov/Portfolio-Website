import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import { getJournalEntries, getLatestPublishedPost, getPostBySlug } from "./posts";

async function makeDocument(blocks: { type: string; text?: object; data?: object }[]) {
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
    it("returns the post with its parsed body blocks", async () => {
        const bodyDocumentId = await makeDocument([
            { type: "lead", text: { en: "Lead", ru: "Лид" } },
            { type: "paragraph", text: { en: "Para", ru: "Абзац" } },
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
});
