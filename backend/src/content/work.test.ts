import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import { getAllWork, getFeaturedWork, getPublishedTechSlugs, getWorkBySlug } from "./work";

const baseWorkData = {
    title: "Test Project",
    year: 2026,
    status: "shipped",
    summary: { en: "s", ru: "s" },
    stack: ["Kotlin"],
    // Every fixture in this file is published unless a test explicitly
    // says otherwise — see "getAllWork / getFeaturedWork — lifecycle
    // filtering" below for the DRAFT-exclusion behavior itself.
    lifecycleState: "PUBLISHED" as const,
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

describe("WorkSummary.availableLocales", () => {
    it("is [\"en\"] for an item with a translated summary but NO Russian case study", async () => {
        // The case Post can never be in: `translateWork` writes
        // `summary.ru` unconditionally and the case-study half only when an
        // English case study exists. Declaring this page a Russian version
        // in hreflang would be a lie — the body is English.
        const document = await prisma.document.create({ data: {} });
        await prisma.work.create({
            data: {
                ...baseWorkData,
                slug: "half-translated",
                summary: { en: "English summary", ru: "Русское описание" },
                caseStudyDocumentId: document.id,
            },
        });

        const [item] = await getAllWork();
        expect(item.availableLocales).toEqual(["en"]);
    });

    it("includes \"ru\" once a Russian case-study document exists", async () => {
        const en = await prisma.document.create({ data: {} });
        const ru = await prisma.document.create({ data: {} });
        await prisma.work.create({
            data: { ...baseWorkData, slug: "translated", caseStudyDocumentId: en.id, caseStudyDocumentIdRu: ru.id },
        });

        const [item] = await getAllWork();
        expect(item.availableLocales).toEqual(["en", "ru"]);
    });

    it("reports contentUpdatedAt as null on a row that has never been edited", async () => {
        await prisma.work.create({ data: { ...baseWorkData, slug: "untouched" } });

        const [item] = await getAllWork();
        expect(item.contentUpdatedAt).toBeNull();
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
                { documentId: document.id, order: 0, type: "heading", text: "Overview" },
                { documentId: document.id, order: 1, type: "paragraph", text: "Body" },
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

    it("locale=\"ru\" reads the Russian case-study Document when one exists, else falls back to English", async () => {
        const enDocA = await prisma.document.create({ data: {} });
        await prisma.block.create({ data: { documentId: enDocA.id, order: 0, type: "paragraph", text: "English A" } });
        const ruDocA = await prisma.document.create({ data: {} });
        await prisma.block.create({ data: { documentId: ruDocA.id, order: 0, type: "paragraph", text: "Русский A" } });
        const enDocB = await prisma.document.create({ data: {} });
        await prisma.block.create({ data: { documentId: enDocB.id, order: 0, type: "paragraph", text: "English B" } });

        await prisma.work.create({
            data: {
                ...baseWorkData,
                slug: "translated",
                caseStudyDocumentId: enDocA.id,
                caseStudyDocumentIdRu: ruDocA.id,
                startedLabel: { en: "Jan", ru: "Янв" },
                shippedLabel: { en: "Feb", ru: "Фев" },
                role: { en: "Engineer", ru: "Инженер" },
            },
        });
        await prisma.work.create({
            data: {
                ...baseWorkData,
                slug: "untranslated",
                caseStudyDocumentId: enDocB.id,
                startedLabel: { en: "Jan", ru: "Янв" },
                shippedLabel: { en: "Feb", ru: "Фев" },
                role: { en: "Engineer", ru: "Инженер" },
            },
        });

        const translated = await getWorkBySlug("translated", "ru");
        expect(translated?.caseStudy?.blocks[0]).toMatchObject({ text: "Русский A" });

        const untranslated = await getWorkBySlug("untranslated", "ru");
        expect(untranslated?.caseStudy?.blocks[0]).toMatchObject({ text: "English B" });
    });
});

describe("getPublishedTechSlugs", () => {
    it("returns the distinct, slugified set of stack entries across published items", async () => {
        await prisma.work.create({ data: { ...baseWorkData, slug: "a", stack: ["Kotlin", "Jetpack Compose"] } });
        await prisma.work.create({ data: { ...baseWorkData, slug: "b", stack: ["Kotlin"] } });

        const slugs = await getPublishedTechSlugs();
        expect(slugs.sort()).toEqual(["jetpack-compose", "kotlin"]);
    });

    it("excludes DRAFT items' stacks", async () => {
        await prisma.work.create({ data: { ...baseWorkData, slug: "draft", stack: ["Rust"], lifecycleState: "DRAFT" } });

        expect(await getPublishedTechSlugs()).toEqual([]);
    });

    it("returns an empty array when there is no published work at all", async () => {
        expect(await getPublishedTechSlugs()).toEqual([]);
    });
});

describe("lifecycleState filtering — content lifecycle state machine", () => {
    it("getAllWork excludes DRAFT items entirely, even though they'd otherwise sort first", async () => {
        await prisma.work.create({ data: { ...baseWorkData, slug: "published", year: 2020 } });
        await prisma.work.create({ data: { ...baseWorkData, slug: "draft", year: 2026, lifecycleState: "DRAFT" } });

        const all = await getAllWork();
        expect(all.map((w) => w.slug)).toEqual(["published"]);
    });

    it("getFeaturedWork excludes a featured DRAFT item", async () => {
        await prisma.work.create({ data: { ...baseWorkData, slug: "draft-featured", featured: true, lifecycleState: "DRAFT" } });

        expect(await getFeaturedWork()).toEqual([]);
    });

    it("getWorkBySlug returns null for a DRAFT item's slug, same as an unknown one", async () => {
        await prisma.work.create({ data: { ...baseWorkData, slug: "draft-item", lifecycleState: "DRAFT" } });

        expect(await getWorkBySlug("draft-item")).toBeNull();
    });

    it("toWorkSummary/getAllWork surface lifecycleState and publishedAt on the returned summary", async () => {
        const publishedAt = new Date("2026-01-15T00:00:00.000Z");
        await prisma.work.create({ data: { ...baseWorkData, slug: "published", publishedAt } });

        const [item] = await getAllWork();
        expect(item.lifecycleState).toBe("PUBLISHED");
        expect(item.publishedAt).toBe(publishedAt.toISOString());
    });
});
