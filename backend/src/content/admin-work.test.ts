import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import { isSlugAlreadyExistsError } from "../errors";
import { isInvalidLifecycleTransitionError } from "./lifecycle";
import {
    createWork,
    deleteWork,
    getWorkDetailForAdmin,
    getWorkForAdmin,
    getWorkTranslationForAdmin,
    publishWork,
    translateWork,
    type TranslateWorkInput,
    unpublishWork,
    type WorkInput,
    updateWork,
    workDraftInputSchema,
} from "./admin-work";
import { getAllWork, getWorkBySlug } from "./work";
import { findCurrentSlug } from "./slug-history";

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

        const item = await getWorkDetailForAdmin("test-project");
        expect(item?.caseStudy).toBeNull();
    });

    it("creates a work item with a full case study", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });

        const item = await getWorkDetailForAdmin("test-project");
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

    it("defaults to lifecycleState DRAFT, invisible on the public site, regardless of the (public) status field", async () => {
        await createWork(baseWorkInput); // status: "shipped"

        const row = await prisma.work.findUnique({ where: { slug: "test-project" } });
        expect(row?.lifecycleState).toBe("DRAFT");
        expect(row?.publishedAt).toBeNull();
        expect(await getWorkBySlug("test-project")).toBeNull();
    });

    it("derives a slug from the title when none is given, appending -2 on collision", async () => {
        const { slug: _omit, ...withoutSlug } = baseWorkInput;
        await createWork(withoutSlug as WorkInput);
        await createWork({ ...(withoutSlug as WorkInput), title: "Test Project" });

        expect(await prisma.work.findUnique({ where: { slug: "test-project" } })).not.toBeNull();
        expect(await prisma.work.findUnique({ where: { slug: "test-project-2" } })).not.toBeNull();
    });

    it("accepts the soft draft contract with only a title — every other field defaults", async () => {
        // Parsed through the real schema, not an `as WorkInput` cast — see
        // admin-posts.test.ts's identical test for why that matters (a
        // cast skips Zod's `.default()`s and passes `undefined` straight
        // to Prisma, a confusing failure unrelated to what's being tested).
        const input = workDraftInputSchema.parse({ title: "Just a title" });
        const created = await createWork(input);

        expect(created.slug).toBe("just-a-title");
        expect(created.summary.en).toBe("");
        expect(created.stack).toEqual([]);
        expect(created.featured).toBe(false);
    });
});

describe("updateWork", () => {
    it("returns null when the slug being edited doesn't exist", async () => {
        expect(await updateWork("nope", baseWorkInput)).toBeNull();
    });

    it("adds a case study to a work item that had none", async () => {
        await createWork(baseWorkInput);
        await updateWork("test-project", { ...baseWorkInput, caseStudy: caseStudyInput });

        const item = await getWorkDetailForAdmin("test-project");
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

        const item = await getWorkDetailForAdmin("test-project");
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

    it("omitting slug keeps the current slug rather than regenerating one from the title", async () => {
        await createWork(baseWorkInput);
        const updated = await updateWork("test-project", { ...baseWorkInput, slug: undefined, title: "A Whole New Title" });

        expect(updated?.slug).toBe("test-project");
    });

    it("never rejects a soft-shaped save even when required publish fields are blanked out", async () => {
        await createWork(baseWorkInput);
        const updated = await updateWork("test-project", { ...baseWorkInput, summary: "" });

        expect(updated).not.toBeNull();
        expect(updated?.summary.en).toBe("");
    });

    it("auto-unpublishes a PUBLISHED item whose update would fail the strict publish contract", async () => {
        await createWork(baseWorkInput);
        await publishWork("test-project");

        const updated = await updateWork("test-project", { ...baseWorkInput, summary: "" });

        expect(updated?.lifecycleState).toBe("DRAFT");
        const row = await prisma.work.findUnique({ where: { slug: "test-project" } });
        expect(row?.lifecycleState).toBe("DRAFT");
    });

    it("leaves a PUBLISHED item published when the update still satisfies the strict publish contract", async () => {
        await createWork(baseWorkInput);
        await publishWork("test-project");

        const updated = await updateWork("test-project", { ...baseWorkInput, summary: "Still complete." });

        expect(updated?.lifecycleState).toBe("PUBLISHED");
    });
});

describe("getWorkForAdmin", () => {
    it("returns both DRAFT and PUBLISHED items, unlike the public getAllWork", async () => {
        await createWork(baseWorkInput);
        await createWork({ ...baseWorkInput, slug: "other" });
        await publishWork("other");

        const all = await getWorkForAdmin();
        expect(all.map((w) => w.slug).sort()).toEqual(["other", "test-project"]);
        expect(await getAllWork()).toHaveLength(1);
    });
});

describe("getWorkDetailForAdmin", () => {
    it("returns null for a slug that doesn't exist", async () => {
        expect(await getWorkDetailForAdmin("nope")).toBeNull();
    });

    it("returns a DRAFT item's full detail — the public getWorkBySlug can't, since it filters lifecycleState", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });

        expect(await getWorkBySlug("test-project")).toBeNull();
        const detail = await getWorkDetailForAdmin("test-project");
        expect(detail?.caseStudy?.role.en).toBe("Sole engineer");
    });
});

describe("publishWork", () => {
    it("returns null when the slug doesn't exist", async () => {
        expect(await publishWork("nope")).toBeNull();
    });

    it("moves a DRAFT item to PUBLISHED, sets publishedAt, and makes it visible publicly", async () => {
        await createWork(baseWorkInput);

        const published = await publishWork("test-project");
        expect(published?.lifecycleState).toBe("PUBLISHED");
        expect(published?.publishedAt).not.toBeNull();
        expect(await getWorkBySlug("test-project")).not.toBeNull();
    });

    it("is idempotent — publishing an already-PUBLISHED item succeeds and keeps the original publishedAt", async () => {
        await createWork(baseWorkInput);
        const first = await publishWork("test-project");

        const second = await publishWork("test-project");
        expect(second?.lifecycleState).toBe("PUBLISHED");
        expect(second?.publishedAt).toBe(first?.publishedAt);
    });

    it("rejects publishing a work item missing a required field (summary), listing what's missing", async () => {
        await createWork({ ...baseWorkInput, summary: "" });

        await expect(publishWork("test-project")).rejects.toMatchObject({ issues: expect.any(Array) });
        expect(await getWorkBySlug("test-project")).toBeNull();
    });

    it("rejects publishing a work item with an incomplete case study (missing role)", async () => {
        await createWork({ ...baseWorkInput, caseStudy: { ...caseStudyInput, role: "" } });

        await expect(publishWork("test-project")).rejects.toMatchObject({ issues: expect.any(Array) });
    });
});

describe("unpublishWork", () => {
    it("returns null when the slug doesn't exist", async () => {
        expect(await unpublishWork("nope")).toBeNull();
    });

    it("moves a PUBLISHED item back to DRAFT, hiding it from the public site, without clearing publishedAt", async () => {
        await createWork(baseWorkInput);
        const published = await publishWork("test-project");

        const unpublished = await unpublishWork("test-project");
        expect(unpublished?.lifecycleState).toBe("DRAFT");
        expect(unpublished?.publishedAt).toBe(published?.publishedAt);
        expect(await getWorkBySlug("test-project")).toBeNull();
    });

    it("throws InvalidLifecycleTransitionError when the item is already DRAFT", async () => {
        await createWork(baseWorkInput);
        await expect(unpublishWork("test-project")).rejects.toSatisfy(isInvalidLifecycleTransitionError);
    });
});

describe("renaming keeps the old address resolvable — see admin-posts.test.ts for the reasoning", () => {
    it("updateWork records the former slug, and deleteWork forgets it", async () => {
        await createWork(baseWorkInput);
        await updateWork("test-project", { ...baseWorkInput, slug: "renamed-project" });
        expect(await findCurrentSlug("work", "test-project")).toBe("renamed-project");

        await deleteWork("renamed-project");
        expect(await findCurrentSlug("work", "test-project")).toBeNull();
    });
});

describe("contentUpdatedAt — see admin-posts.test.ts for the full reasoning", () => {
    it("survives a publish/unpublish/publish cycle untouched, but moves on updateWork", async () => {
        await createWork(baseWorkInput);
        await updateWork("test-project", baseWorkInput);
        const afterEdit = (await getWorkDetailForAdmin("test-project"))!.contentUpdatedAt;
        expect(afterEdit).not.toBeNull();

        await publishWork("test-project");
        await unpublishWork("test-project");
        await publishWork("test-project");

        expect((await getWorkDetailForAdmin("test-project"))!.contentUpdatedAt).toBe(afterEdit);
    });

    it("moves on translateWork", async () => {
        await createWork(baseWorkInput);
        expect((await getWorkDetailForAdmin("test-project"))!.contentUpdatedAt).toBeNull();

        await translateWork("test-project", baseTranslationInput);
        expect((await getWorkDetailForAdmin("test-project"))!.contentUpdatedAt).not.toBeNull();
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
