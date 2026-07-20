import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import { isSlugAlreadyExistsError } from "../errors";
import {
    createWork,
    deleteWork,
    getWorkTranslationForAdmin,
    translateWork,
    type TranslateWorkInput,
    type WorkInput,
    updateWork,
} from "./admin-work";
import { getWorkBySlug } from "./work";

const baseWorkInput: WorkInput = {
    slug: "test-project",
    title: "Test Project",
    year: 2026,
    status: "shipped",
    summary: "A summary.",
    stack: ["Kotlin"],
    coverImage: null,
    featured: false,
    relatedPostSlug: null,
    caseStudy: null,
};

const caseStudyInput = {
    startedLabel: "Jan 2026",
    shippedLabel: "Mar 2026",
    role: "Sole engineer",
    heroImage: null,
    blocks: [{ type: "lead" as const, text: "Lead." }],
};

const baseTranslationInput: TranslateWorkInput = {
    summary: "Сводка.",
    startedLabel: "Янв 2026",
    shippedLabel: "Мар 2026",
    role: "Единственный разработчик",
    blocks: [{ type: "lead", text: "Лид." }],
};

beforeEach(async () => {
    await resetTestDatabase();
});

describe("createWork", () => {
    it("creates a work item with no case study", async () => {
        await createWork(baseWorkInput);

        const item = await getWorkBySlug("test-project");
        expect(item?.caseStudy).toBeNull();
    });

    it("creates a work item with a full case study", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });

        const item = await getWorkBySlug("test-project");
        expect(item?.caseStudy?.role.en).toBe("Sole engineer");
        expect(item?.caseStudy?.blocks.map((b) => b.type)).toEqual(["lead"]);
    });

    it("rejects a duplicate slug with SlugAlreadyExistsError", async () => {
        await createWork(baseWorkInput);
        await expect(createWork(baseWorkInput)).rejects.toSatisfy(isSlugAlreadyExistsError);
    });

    it("writes ru: \"\" on every localized metadata field — English-only, same as createPost", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });

        const row = await prisma.work.findUnique({ where: { slug: "test-project" } });
        expect(row?.summary).toEqual({ en: "A summary.", ru: "" });
        expect(row?.role).toEqual({ en: "Sole engineer", ru: "" });
        expect(row?.startedLabel).toEqual({ en: "Jan 2026", ru: "" });
        expect(row?.shippedLabel).toEqual({ en: "Mar 2026", ru: "" });
    });
});

describe("updateWork", () => {
    it("returns null when the slug being edited doesn't exist", async () => {
        expect(await updateWork("nope", baseWorkInput)).toBeNull();
    });

    it("adds a case study to a work item that had none", async () => {
        await createWork(baseWorkInput);
        await updateWork("test-project", { ...baseWorkInput, caseStudy: caseStudyInput });

        const item = await getWorkBySlug("test-project");
        expect(item?.caseStudy?.blocks).toHaveLength(1);
    });

    it("removing the case study clears the label fields AND deletes the Document", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });
        await updateWork("test-project", { ...baseWorkInput, caseStudy: null });

        const row = await prisma.work.findUnique({ where: { slug: "test-project" } });
        expect(row?.caseStudyDocumentId).toBeNull();
        expect(row?.role).toBeNull();
        expect(row?.startedLabel).toBeNull();
        expect(row?.shippedLabel).toBeNull();
        expect(await prisma.document.count()).toBe(0);

        const item = await getWorkBySlug("test-project");
        expect(item?.caseStudy).toBeNull();
    });

    it("removing the case study also deletes the Russian case-study translation, if one exists", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });
        await translateWork("test-project", baseTranslationInput);

        await updateWork("test-project", { ...baseWorkInput, caseStudy: null });

        expect(await prisma.document.count()).toBe(0);
    });

    it("replaces case-study blocks in place, reusing the same Document row", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });
        const before = await prisma.work.findUnique({ where: { slug: "test-project" } });

        await updateWork("test-project", {
            ...baseWorkInput,
            caseStudy: { ...caseStudyInput, blocks: [{ type: "paragraph", text: "P" }] },
        });

        const after = await prisma.work.findUnique({ where: { slug: "test-project" } });
        expect(after?.caseStudyDocumentId).toBe(before?.caseStudyDocumentId);
    });

    it("a subsequent English-only update does not wipe out an existing Russian translation", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });
        await translateWork("test-project", baseTranslationInput);

        await updateWork("test-project", { ...baseWorkInput, summary: "Updated summary.", caseStudy: caseStudyInput });

        const row = await prisma.work.findUnique({ where: { slug: "test-project" } });
        expect(row?.summary).toEqual({ en: "Updated summary.", ru: "Сводка." });
        expect(row?.role).toEqual({ en: "Sole engineer", ru: "Единственный разработчик" });
    });
});

describe("deleteWork", () => {
    it("returns false for a slug that doesn't exist", async () => {
        expect(await deleteWork("nope")).toBe(false);
    });

    it("deletes the work item and its case-study Document/Blocks", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });

        expect(await deleteWork("test-project")).toBe(true);
        expect(await prisma.work.findUnique({ where: { slug: "test-project" } })).toBeNull();
        expect(await prisma.document.count()).toBe(0);
        expect(await prisma.block.count()).toBe(0);
    });

    it("also deletes the Russian case-study translation Document, if one exists", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });
        await translateWork("test-project", baseTranslationInput);

        expect(await deleteWork("test-project")).toBe(true);
        expect(await prisma.document.count()).toBe(0);
    });
});

describe("getWorkTranslationForAdmin", () => {
    it("returns null for a slug that doesn't exist", async () => {
        expect(await getWorkTranslationForAdmin("nope")).toBeNull();
    });

    it("hasCaseStudy is false and caseStudyBlocks is [] for an item with no English case study", async () => {
        await createWork(baseWorkInput);

        const translation = await getWorkTranslationForAdmin("test-project");
        expect(translation?.hasCaseStudy).toBe(false);
        expect(translation?.caseStudyBlocks).toEqual([]);
    });

    it("hasCaseStudy is true with empty ru fields for an untranslated case study", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });

        const translation = await getWorkTranslationForAdmin("test-project");
        expect(translation?.hasCaseStudy).toBe(true);
        expect(translation?.role).toEqual({ en: "Sole engineer", ru: "" });
        expect(translation?.caseStudyBlocks).toEqual([]);
    });
});

describe("translateWork", () => {
    it("returns null when the slug doesn't exist", async () => {
        expect(await translateWork("nope", baseTranslationInput)).toBeNull();
    });

    it("writes the Russian summary even when there's no case study at all", async () => {
        await createWork(baseWorkInput);
        await translateWork("test-project", baseTranslationInput);

        const row = await prisma.work.findUnique({ where: { slug: "test-project" } });
        expect(row?.summary).toEqual({ en: "A summary.", ru: "Сводка." });
        expect(row?.caseStudyDocumentIdRu).toBeNull();
    });

    it("writes the Russian case study (labels + independent Document) when an English one exists", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });
        const before = await prisma.work.findUnique({ where: { slug: "test-project" } });

        await translateWork("test-project", baseTranslationInput);

        const after = await prisma.work.findUnique({ where: { slug: "test-project" } });
        expect(after?.caseStudyDocumentId).toBe(before?.caseStudyDocumentId);
        expect(after?.caseStudyDocumentIdRu).not.toBeNull();
        expect(after?.role).toEqual({ en: "Sole engineer", ru: "Единственный разработчик" });

        const translation = await getWorkTranslationForAdmin("test-project");
        expect(translation?.caseStudyBlocks.map((b) => b.type)).toEqual(["lead"]);
    });
});
