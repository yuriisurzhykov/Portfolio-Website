import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import { getAllWork, getFeaturedWork, getWorkBySlug } from "./work";

const baseWorkData = {
    title: "Test Project",
    year: 2026,
    status: "shipped",
    summary: { en: "s", ru: "s" },
    stack: ["Kotlin"],
};

beforeEach(async () => {
    await resetTestDatabase();
});

describe("getAllWork / getFeaturedWork", () => {
    it("getAllWork returns everything, newest year first", async () => {
        await prisma.work.create({ data: { ...baseWorkData, slug: "old", year: 2020 } });
        await prisma.work.create({ data: { ...baseWorkData, slug: "new", year: 2025 } });

        const all = await getAllWork();
        expect(all.map((w) => w.slug)).toEqual(["new", "old"]);
    });

    it("getFeaturedWork only returns featured: true items", async () => {
        await prisma.work.create({ data: { ...baseWorkData, slug: "featured-one", featured: true } });
        await prisma.work.create({ data: { ...baseWorkData, slug: "not-featured", featured: false } });

        const featured = await getFeaturedWork();
        expect(featured.map((w) => w.slug)).toEqual(["featured-one"]);
    });

    it("hasCaseStudy reflects whether caseStudyDocumentId is set, without fetching blocks", async () => {
        const document = await prisma.document.create({ data: {} });
        await prisma.work.create({ data: { ...baseWorkData, slug: "with-cs", caseStudyDocumentId: document.id } });
        await prisma.work.create({ data: { ...baseWorkData, slug: "without-cs" } });

        const all = await getAllWork();
        expect(all.find((w) => w.slug === "with-cs")?.hasCaseStudy).toBe(true);
        expect(all.find((w) => w.slug === "without-cs")?.hasCaseStudy).toBe(false);
    });
});

describe("getWorkBySlug", () => {
    it("returns null for an unknown slug", async () => {
        expect(await getWorkBySlug("does-not-exist")).toBeNull();
    });

    it("returns caseStudy: null for an item with no case study", async () => {
        await prisma.work.create({ data: { ...baseWorkData, slug: "no-cs" } });
        const item = await getWorkBySlug("no-cs");
        expect(item?.caseStudy).toBeNull();
    });

    it("returns the full case study with parsed blocks and metadata", async () => {
        const document = await prisma.document.create({ data: {} });
        await prisma.block.createMany({
            data: [
                { documentId: document.id, order: 0, type: "heading", text: { en: "Overview", ru: "Обзор" } },
                { documentId: document.id, order: 1, type: "paragraph", text: { en: "Body", ru: "Текст" } },
            ],
        });
        await prisma.work.create({
            data: {
                ...baseWorkData,
                slug: "with-cs",
                caseStudyDocumentId: document.id,
                startedLabel: { en: "Jan", ru: "Янв" },
                shippedLabel: { en: "Feb", ru: "Фев" },
                role: { en: "Sole engineer", ru: "Единственный разработчик" },
            },
        });

        const item = await getWorkBySlug("with-cs");
        expect(item?.caseStudy?.blocks.map((b) => b.type)).toEqual(["heading", "paragraph"]);
        expect(item?.caseStudy?.role.en).toBe("Sole engineer");
    });
});
