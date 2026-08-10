import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import { isSlugAlreadyExistsError } from "../errors";
import { isInvalidLifecycleTransitionError } from "./lifecycle";
import {
    createWork,
    deleteWork,
    discardWorkDraft,
    getWorkDetailForAdmin,
    getWorkForAdmin,
    getWorkPreview,
    getWorkTranslationForAdmin,
    listWorkRevisions,
    publishWork,
    restoreWorkRevision,
    saveWorkDraft,
    translateWork,
    type TranslateWorkInput,
    unpublishWork,
    type WorkInput,
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

    it("creates no ContentDraft row — same reasoning as createPost", async () => {
        await createWork(baseWorkInput);
        expect(await prisma.contentDraft.count()).toBe(0);
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

describe("saveWorkDraft", () => {
    it("returns null when the slug being edited doesn't exist", async () => {
        expect(await saveWorkDraft("nope", baseWorkInput)).toBeNull();
    });

    it("NEVER touches the live Work row — same fix, same reasoning as savePostDraft", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });
        const before = await prisma.work.findUnique({ where: { slug: "test-project" } });

        await saveWorkDraft("test-project", {
            ...baseWorkInput,
            title: "A Whole New Title",
            caseStudy: { ...caseStudyInput, blocks: [{ type: "paragraph", text: "P" }] },
        });

        const after = await prisma.work.findUnique({ where: { slug: "test-project" } });
        expect(after).toEqual(before);
        const detail = await getWorkDetailForAdmin("test-project");
        expect(detail?.title).toBe("A Whole New Title"); // draft-priority for admin reads
        expect(detail?.caseStudy?.blocks.map((b) => b.type)).toEqual(["paragraph"]);
    });

    it("adding a case study to an item that had none stays a pending draft — the live row keeps caseStudyDocumentId: null", async () => {
        await createWork(baseWorkInput);

        await saveWorkDraft("test-project", { ...baseWorkInput, caseStudy: caseStudyInput });

        expect((await prisma.work.findUnique({ where: { slug: "test-project" } }))?.caseStudyDocumentId).toBeNull();
        expect((await getWorkDetailForAdmin("test-project"))?.caseStudy?.blocks).toHaveLength(1);
    });

    it("never rejects a soft-shaped save even when required publish fields are blanked out", async () => {
        await createWork(baseWorkInput);
        const updated = await saveWorkDraft("test-project", { ...baseWorkInput, summary: "" });

        expect(updated).not.toBeNull();
        expect(updated?.summary.en).toBe("");
    });

    it("does NOT auto-unpublish a PUBLISHED item — the safety net no longer has a job (a draft can't touch the live row at all)", async () => {
        await createWork(baseWorkInput);
        await publishWork("test-project");

        const updated = await saveWorkDraft("test-project", { ...baseWorkInput, summary: "" });

        expect(updated?.lifecycleState).toBe("PUBLISHED");
        const row = await prisma.work.findUnique({ where: { slug: "test-project" } });
        expect(row?.lifecycleState).toBe("PUBLISHED");
    });

    it("a pending rename does not change the live slug", async () => {
        await createWork(baseWorkInput);

        const result = await saveWorkDraft("test-project", { ...baseWorkInput, slug: "renamed-project" });

        expect(result?.slug).toBe("test-project");
        expect(await prisma.work.findUnique({ where: { slug: "renamed-project" } })).toBeNull();
        expect((await getWorkDetailForAdmin("test-project"))?.draftSlug).toBe("renamed-project");
    });

    it("preserves a pending translation across an English-only save", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });
        await translateWork("test-project", baseTranslationInput);

        await saveWorkDraft("test-project", { ...baseWorkInput, caseStudy: caseStudyInput, summary: "Edited summary." });

        const translation = await getWorkTranslationForAdmin("test-project");
        expect(translation?.summary.ru).toBe("Сводка.");
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

    it("flags hasUnpublishedChanges per row", async () => {
        await createWork(baseWorkInput);
        await publishWork("test-project");
        await saveWorkDraft("test-project", { ...baseWorkInput, title: "Pending Title" });

        const all = await getWorkForAdmin();
        const row = all.find((w) => w.slug === "test-project");
        expect(row?.hasUnpublishedChanges).toBe(true);
        expect(row?.title).toBe("Pending Title");
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

    it("draftSlug equals the live slug and hasUnpublishedChanges is false when there's no draft", async () => {
        await createWork(baseWorkInput);

        const detail = await getWorkDetailForAdmin("test-project");
        expect(detail?.draftSlug).toBe("test-project");
        expect(detail?.hasUnpublishedChanges).toBe(false);
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

    it("is idempotent — publishing an already-PUBLISHED item with no pending draft succeeds and keeps the original publishedAt", async () => {
        await createWork(baseWorkInput);
        const first = await publishWork("test-project");

        const second = await publishWork("test-project");
        expect(second?.lifecycleState).toBe("PUBLISHED");
        expect(second?.publishedAt).toBe(first?.publishedAt);
    });

    it("applies a pending draft's content to the live row", async () => {
        await createWork(baseWorkInput);
        await publishWork("test-project");
        await saveWorkDraft("test-project", { ...baseWorkInput, title: "New Title", caseStudy: caseStudyInput });

        await publishWork("test-project");

        const item = await getWorkBySlug("test-project");
        expect(item?.title).toBe("New Title");
        expect(item?.caseStudy?.blocks.map((b) => b.type)).toEqual(["lead"]);
    });

    it("discards the draft once it's applied", async () => {
        await createWork(baseWorkInput);
        await publishWork("test-project");
        await saveWorkDraft("test-project", { ...baseWorkInput, summary: "Edited." });

        await publishWork("test-project");

        expect(await prisma.contentDraft.count()).toBe(0);
        expect((await getWorkDetailForAdmin("test-project"))?.hasUnpublishedChanges).toBe(false);
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

    it("validates the DRAFT's pending content, leaving the live row untouched, when the draft would fail publish", async () => {
        await createWork(baseWorkInput);
        await publishWork("test-project");
        await saveWorkDraft("test-project", { ...baseWorkInput, summary: "" });

        await expect(publishWork("test-project")).rejects.toMatchObject({ issues: expect.any(Array) });
        expect((await getWorkBySlug("test-project"))?.summary.en).toBe("A summary.");
        expect((await getWorkDetailForAdmin("test-project"))?.hasUnpublishedChanges).toBe(true);
    });

    it("is a genuine no-op when already PUBLISHED with no pending draft", async () => {
        await createWork(baseWorkInput);
        await publishWork("test-project");
        const before = await prisma.work.findUnique({ where: { slug: "test-project" } });

        await publishWork("test-project");

        const after = await prisma.work.findUnique({ where: { slug: "test-project" } });
        expect(after).toEqual(before);
        expect(await prisma.contentRevision.count()).toBe(0);
    });

    it("snapshots the previous live content as a ContentRevision only when a draft is applied to an already-published item, never on the first publish", async () => {
        await createWork(baseWorkInput);
        await publishWork("test-project"); // first publish — nothing to snapshot
        expect(await prisma.contentRevision.count()).toBe(0);

        await saveWorkDraft("test-project", { ...baseWorkInput, summary: "v2" });
        await publishWork("test-project");

        expect(await listWorkRevisions("test-project")).toHaveLength(1);
    });

    it("applies a pending rename to the live slug and records SlugHistory only at publish time", async () => {
        await createWork(baseWorkInput);
        await publishWork("test-project");
        await saveWorkDraft("test-project", { ...baseWorkInput, slug: "renamed-project" });
        expect(await findCurrentSlug("work", "test-project")).toBeNull();

        const published = await publishWork("test-project");

        expect(published?.slug).toBe("renamed-project");
        expect(await findCurrentSlug("work", "test-project")).toBe("renamed-project");
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

describe("discardWorkDraft", () => {
    it("returns null when the slug doesn't exist", async () => {
        expect(await discardWorkDraft("nope")).toBeNull();
    });

    it("removes the pending draft and reverts to the live content", async () => {
        await createWork(baseWorkInput);
        await publishWork("test-project");
        await saveWorkDraft("test-project", { ...baseWorkInput, title: "Pending Title" });

        const reverted = await discardWorkDraft("test-project");

        expect(reverted?.title).toBe("Test Project");
        expect(reverted?.hasUnpublishedChanges).toBe(false);
        expect(await prisma.contentDraft.count()).toBe(0);
    });
});

describe("listWorkRevisions / restoreWorkRevision", () => {
    it("returns null for an unknown slug", async () => {
        expect(await listWorkRevisions("nope")).toBeNull();
    });

    it("restoring loads a past version into the draft without touching the live row", async () => {
        await createWork(baseWorkInput); // summary: "A summary."
        await publishWork("test-project");
        await saveWorkDraft("test-project", { ...baseWorkInput, summary: "v2" });
        await publishWork("test-project"); // live summary is now "v2"
        const [revision] = (await listWorkRevisions("test-project"))!;

        const restored = await restoreWorkRevision("test-project", revision.id);

        expect(restored?.summary.en).toBe("A summary.");
        expect((await getWorkBySlug("test-project"))?.summary.en).toBe("v2");
    });

    it("returns null for an unrelated revision id", async () => {
        await createWork(baseWorkInput);
        expect(await restoreWorkRevision("test-project", "not-a-real-id")).toBeNull();
    });
});

describe("renaming keeps the old address resolvable — see admin-posts.test.ts for the reasoning", () => {
    it("publishWork records the former slug, and deleteWork forgets it", async () => {
        await createWork(baseWorkInput);
        await publishWork("test-project");
        await saveWorkDraft("test-project", { ...baseWorkInput, slug: "renamed-project" });
        await publishWork("test-project");
        expect(await findCurrentSlug("work", "test-project")).toBe("renamed-project");

        await deleteWork("renamed-project");
        expect(await findCurrentSlug("work", "test-project")).toBeNull();
    });
});

describe("contentUpdatedAt — see admin-posts.test.ts for the full reasoning", () => {
    it("is NOT moved by saveWorkDraft, moves only once a draft is actually published", async () => {
        await createWork(baseWorkInput);
        await publishWork("test-project");

        await saveWorkDraft("test-project", { ...baseWorkInput, summary: "Edited but not published." });
        expect((await getWorkBySlug("test-project"))?.contentUpdatedAt).toBeNull();

        await publishWork("test-project");
        expect((await getWorkBySlug("test-project"))?.contentUpdatedAt).not.toBeNull();
    });

    it("survives a publish/unpublish/publish cycle untouched when nothing else changed", async () => {
        await createWork(baseWorkInput);
        await saveWorkDraft("test-project", baseWorkInput);
        await publishWork("test-project");
        const afterFirstPublish = (await getWorkDetailForAdmin("test-project"))!.contentUpdatedAt;
        expect(afterFirstPublish).not.toBeNull();

        await unpublishWork("test-project");
        await publishWork("test-project"); // no pending draft — the no-op path

        expect((await getWorkDetailForAdmin("test-project"))!.contentUpdatedAt).toBe(afterFirstPublish);
    });

    it("moves on translateWork's translation once it's published", async () => {
        await createWork(baseWorkInput);
        await publishWork("test-project");
        expect((await getWorkDetailForAdmin("test-project"))!.contentUpdatedAt).toBeNull();

        await translateWork("test-project", baseTranslationInput);
        expect((await getWorkDetailForAdmin("test-project"))!.contentUpdatedAt).toBeNull(); // still pending

        await publishWork("test-project");
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
        await publishWork("test-project");
        await translateWork("test-project", baseTranslationInput);
        await publishWork("test-project");

        expect(await deleteWork("test-project")).toBe(true);
        expect(await prisma.document.count()).toBe(0);
    });

    it("cleans up ContentDraft AND ContentRevision rows", async () => {
        await createWork(baseWorkInput);
        await publishWork("test-project");
        await saveWorkDraft("test-project", { ...baseWorkInput, summary: "v2" });
        await publishWork("test-project");
        await saveWorkDraft("test-project", { ...baseWorkInput, summary: "v3" });

        await deleteWork("test-project");

        expect(await prisma.contentDraft.count()).toBe(0);
        expect(await prisma.contentRevision.count()).toBe(0);
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

    it("writes the pending Russian summary even when there's no case study at all — the LIVE row is untouched until publish", async () => {
        await createWork(baseWorkInput);
        await publishWork("test-project");

        await translateWork("test-project", baseTranslationInput);

        expect((await prisma.work.findUnique({ where: { slug: "test-project" } }))?.summary).toEqual({ en: "A summary.", ru: "" });

        await publishWork("test-project");

        const row = await prisma.work.findUnique({ where: { slug: "test-project" } });
        expect(row?.summary).toEqual({ en: "A summary.", ru: "Сводка." });
        expect(row?.caseStudyDocumentIdRu).toBeNull();
    });

    it("writes the Russian case study (labels + independent Document) once published, when an English one exists", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });
        await publishWork("test-project");
        const before = await prisma.work.findUnique({ where: { slug: "test-project" } });

        await translateWork("test-project", baseTranslationInput);
        await publishWork("test-project");

        const after = await prisma.work.findUnique({ where: { slug: "test-project" } });
        expect(after?.caseStudyDocumentId).toBe(before?.caseStudyDocumentId);
        expect(after?.caseStudyDocumentIdRu).not.toBeNull();
        expect(after?.role).toEqual({ en: "Sole engineer", ru: "Единственный разработчик" });

        const translation = await getWorkTranslationForAdmin("test-project");
        expect(translation?.caseStudyBlocks.map((b) => b.type)).toEqual(["lead"]);
    });

    it("a subsequent English-only save + publish does not wipe out an already-live Russian translation", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });
        await publishWork("test-project");
        await translateWork("test-project", baseTranslationInput);
        await publishWork("test-project");

        await saveWorkDraft("test-project", { ...baseWorkInput, summary: "Updated summary.", caseStudy: caseStudyInput });
        await publishWork("test-project");

        const row = await prisma.work.findUnique({ where: { slug: "test-project" } });
        expect(row?.summary).toEqual({ en: "Updated summary.", ru: "Сводка." });
        expect(row?.role).toEqual({ en: "Sole engineer", ru: "Единственный разработчик" });
    });
});

describe("removing a case study — see admin-work's own comments for the full reasoning", () => {
    it("removing the case study clears the label fields AND deletes the Document, once published", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });
        await publishWork("test-project");

        await saveWorkDraft("test-project", { ...baseWorkInput, caseStudy: null });
        await publishWork("test-project");

        const row = await prisma.work.findUnique({ where: { slug: "test-project" } });
        expect(row?.caseStudyDocumentId).toBeNull();
        expect(row?.role).toBeNull();
        expect(row?.startedLabel).toBeNull();
        expect(row?.shippedLabel).toBeNull();
        expect(await prisma.document.count()).toBe(0);

        const item = await getWorkDetailForAdmin("test-project");
        expect(item?.caseStudy).toBeNull();
    });

    it("removing the case study also deletes the Russian case-study translation, once published", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });
        await publishWork("test-project");
        await translateWork("test-project", baseTranslationInput);
        await publishWork("test-project");

        await saveWorkDraft("test-project", { ...baseWorkInput, caseStudy: null });
        await publishWork("test-project");

        expect(await prisma.document.count()).toBe(0);
    });

    it("replaces case-study blocks in place, reusing the same Document row, once published", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });
        await publishWork("test-project");
        const before = await prisma.work.findUnique({ where: { slug: "test-project" } });

        await saveWorkDraft("test-project", {
            ...baseWorkInput,
            caseStudy: { ...caseStudyInput, blocks: [{ type: "paragraph", text: "P" }] },
        });
        await publishWork("test-project");

        const after = await prisma.work.findUnique({ where: { slug: "test-project" } });
        expect(after?.caseStudyDocumentId).toBe(before?.caseStudyDocumentId);
    });
});

describe("getWorkPreview", () => {
    it("returns null when the slug doesn't exist", async () => {
        expect(await getWorkPreview("nope")).toBeNull();
    });

    it("previews a never-published DRAFT item", async () => {
        await createWork({ ...baseWorkInput, caseStudy: caseStudyInput });

        const preview = await getWorkPreview("test-project");
        expect(preview?.caseStudy?.blocks.map((b) => b.type)).toEqual(["lead"]);
    });

    it("shows the PENDING draft's content for an already-published item, not the stale live content", async () => {
        await createWork(baseWorkInput);
        await publishWork("test-project");
        await saveWorkDraft("test-project", { ...baseWorkInput, title: "Unpublished Rewrite" });

        const preview = await getWorkPreview("test-project");
        expect(preview?.title).toBe("Unpublished Rewrite");
        expect((await getWorkBySlug("test-project"))?.title).toBe("Test Project");
    });
});
