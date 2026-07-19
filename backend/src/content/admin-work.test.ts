import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import { isSlugAlreadyExistsError } from "../errors";
import { createWork, deleteWork, type WorkInput, updateWork } from "./admin-work";
import { getWorkBySlug } from "./work";

const baseWorkInput: WorkInput = {
    slug: "test-project",
    title: "Test Project",
    year: 2026,
    status: "shipped",
    summary: { en: "A summary.", ru: "Сводка." },
    stack: ["Kotlin"],
    coverImage: null,
    featured: false,
    relatedPostSlug: null,
    caseStudy: null,
};

const caseStudyInput = {
    startedLabel: { en: "Jan 2026", ru: "Янв 2026" },
    shippedLabel: { en: "Mar 2026", ru: "Мар 2026" },
    role: { en: "Sole engineer", ru: "Единственный разработчик" },
    heroImage: null,
    blocks: [{ type: "lead" as const, text: { en: "Lead.", ru: "Лид." } }],
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

    it("replaces case-study blocks in place, reusing the same Document row", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });
        const before = await prisma.work.findUnique({ where: { slug: "test-project" } });

        await updateWork("test-project", {
            ...baseWorkInput,
            caseStudy: { ...caseStudyInput, blocks: [{ type: "paragraph", text: { en: "P", ru: "П" } }] },
        });

        const after = await prisma.work.findUnique({ where: { slug: "test-project" } });
        expect(after?.caseStudyDocumentId).toBe(before?.caseStudyDocumentId);
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
});
