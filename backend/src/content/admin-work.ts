import type { Work as WorkRow } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/client";
import { SlugAlreadyExistsError } from "../errors";
import { type Block, blockInputSchema } from "./blocks";
import {
    discardAllDraftHistory,
    discardDraft,
    listRevisions,
    readDraft,
    readDraftsFor,
    restoreRevisionToDraft,
    saveDraft,
    snapshotRevision,
    type RevisionSummary,
} from "./content-draft";
import { toDisplayBlocks } from "./draft-blocks";
import { getDocumentBlocks, replaceDocumentContent } from "./document";
import type { LifecycleState } from "./lifecycle";
import { nextState } from "./lifecycle";
import { localizedTextSchema, type LocalizedText } from "./localized-text";
import type { ContentLocale } from "./locale";
import { generateUniqueSlug, slugSchema } from "./slug";
import { toWorkSummary, type WorkDetail, type WorkStatus, type WorkSummary } from "./work";
import { notifyContentChanged } from "./content-change-notifier";
import { claimSlug, forgetSlugHistory, recordSlugChange } from "./slug-history";

/** Work's half of `admin-posts.ts`'s `KIND` — same reasoning, different `kind`. */
const KIND = "work" as const;

/** Work's half of the rule documented on admin-posts.ts's `announcePostChange` — same policy, different `kind`. */
function announceWorkChange(
    summary: WorkSummary,
    options: { wasPublic: boolean; isPublic: boolean; previousSlug: string | null },
): void {
    if (!options.isPublic && !options.wasPublic) {
        return;
    }
    notifyContentChanged({
        kind: "work",
        slug: summary.slug,
        previousSlug: options.previousSlug,
        isPublic: options.isPublic,
        availableLocales: summary.availableLocales,
    });
}

/** English content only — same reasoning as `postDraftInputSchema` (admin-posts.ts): the create/edit screen never touches `ru` at all, `translateWorkInputSchema` below is the only writer for it. */
const caseStudyDraftInputSchema = z.object({
    startedLabel: z.string().default(""),
    shippedLabel: z.string().default(""),
    role: z.string().default(""),
    heroImage: z.string().nullish(),
    // Whole-document replace, not incremental block edits — see
    // document.ts's `replaceDocumentContent` for why.
    blocks: z.array(blockInputSchema).default([]),
});
const caseStudyPublishSchema = z.object({
    startedLabel: z.string().min(1),
    shippedLabel: z.string().min(1),
    role: z.string().min(1),
    heroImage: z.string().nullish(),
    blocks: z.array(blockInputSchema),
});

/**
 * The STRICT contract — see admin-posts.ts's `postPublishSchema` for the
 * full reasoning (same rename, same date, same split). Used only by
 * `publishWork()`, validating the EFFECTIVE content about to become live
 * (the pending draft, or the live row itself if there's no draft — see
 * `materializeDraft`).
 */
export const workPublishSchema = z.object({
    slug: slugSchema,
    title: z.string().min(1),
    year: z.number().int(),
    status: z.enum(["shipped", "in-progress"] satisfies WorkStatus[]),
    summary: z.string().min(1),
    stack: z.array(z.string()),
    coverImage: z.string().nullish(),
    featured: z.boolean(),
    relatedPostSlug: z.string().nullish(),
    // `null` here means "no case study" as a whole — the admin editor's
    // "has case study" toggle maps straight onto this, rather than every
    // case-study field being independently nullable.
    caseStudy: caseStudyPublishSchema.nullable(),
});

/**
 * The SOFT contract — everything except `title` is optional/defaults to
 * an empty value, `slug` may be omitted (server-derived — see
 * `generateUniqueSlug`, `slug.ts`). What every autosave sends, and (since
 * the draft/publish split, see content/README.md's dated entry) now ONLY
 * ever lands in `saveWorkDraft` — never the live row directly.
 */
export const workDraftInputSchema = z.object({
    slug: slugSchema.optional(),
    title: z.string().min(1),
    year: z.number().int().default(() => new Date().getFullYear()),
    status: z.enum(["shipped", "in-progress"] satisfies WorkStatus[]).default("shipped"),
    summary: z.string().default(""),
    stack: z.array(z.string()).default([]),
    coverImage: z.string().nullish(),
    featured: z.boolean().default(false),
    relatedPostSlug: z.string().nullish(),
    caseStudy: caseStudyDraftInputSchema.nullable().default(null),
});
export type WorkInput = z.infer<typeof workDraftInputSchema>;

/**
 * The "Add translation"/"Edit translation" screen's write contract
 * (`/admin/work/[slug]/translate` → `PUT /api/admin/work/[slug]/translation`).
 * `startedLabel`/`shippedLabel`/`role`/`blocks` are only meaningful (and
 * only applied — see `applyWorkDraftToRow`) when the item's EFFECTIVE
 * content already has an English case study; a work item with none has
 * nothing case-study-shaped to translate, so the translate page simply
 * hides that section and these fields go unused rather than rejected.
 */
export const translateWorkInputSchema = z.object({
    summary: z.string(),
    startedLabel: z.string(),
    shippedLabel: z.string(),
    role: z.string(),
    blocks: z.array(blockInputSchema),
});
export type TranslateWorkInput = z.infer<typeof translateWorkInputSchema>;

/**
 * The whole pending-edit payload persisted in `ContentDraft.data` for a
 * work item — `WorkInput` plus an optional pending Russian translation.
 * See admin-posts.ts's `postDraftDataSchema` for the full reasoning (same
 * move, same date, same "translation moved off the live row").
 */
export const workDraftDataSchema = workDraftInputSchema.extend({
    translation: translateWorkInputSchema.nullish(),
});
export type WorkDraftData = z.infer<typeof workDraftDataSchema>;

/** What `/admin/work/[slug]/translate` reads before rendering its form. */
export interface AdminWorkTranslation {
    slug: string;
    summary: LocalizedText;
    /** Whether the EFFECTIVE content has an English case study at all to translate — drives whether the translate page shows the case-study section. */
    hasCaseStudy: boolean;
    startedLabel: LocalizedText;
    shippedLabel: LocalizedText;
    role: LocalizedText;
    /** The Russian case study's blocks — `[]` (not a fallback to English) when no translation (published OR pending) exists yet, same reasoning as `AdminPostTranslation.blocks`. */
    caseStudyBlocks: Block[];
}

export interface AdminWorkDetail extends WorkSummary {
    /**
     * Bilingual, same shape as the public `CaseStudy` (work.ts) — EN side
     * is draft-priority (from `data.caseStudy`), RU side is
     * draft-priority too (from a pending `data.translation` when one
     * exists, otherwise whatever's already live) — same reasoning as
     * `toEffectiveSummary`'s `title.ru`/`summary.ru` overlay above.
     */
    caseStudy: {
        startedLabel: LocalizedText;
        shippedLabel: LocalizedText;
        role: LocalizedText;
        heroImage: string | null;
        blocks: Block[];
    } | null;
    /** Same reasoning as `AdminPostDetail.draftSlug` (admin-posts.ts) — the pending rename, distinct from the live, routing-stable `slug`. */
    draftSlug: string;
    hasUnpublishedChanges: boolean;
}

/** Same reasoning as `admin-posts.ts`'s `AdminPostListItem`. */
export interface AdminWorkListItem extends WorkSummary {
    hasUnpublishedChanges: boolean;
}

/** Work's half of `admin-posts.ts`'s `materializeDraft` — same reasoning, same "turn what's live back into the draft shape" contract. */
async function materializeDraft(row: WorkRow): Promise<WorkDraftData> {
    const summary = localizedTextSchema.parse(row.summary);
    const startedLabel = row.startedLabel ? localizedTextSchema.parse(row.startedLabel) : null;
    const shippedLabel = row.shippedLabel ? localizedTextSchema.parse(row.shippedLabel) : null;
    const role = row.role ? localizedTextSchema.parse(row.role) : null;

    const caseStudy = row.caseStudyDocumentId
        ? {
            startedLabel: startedLabel?.en ?? "",
            shippedLabel: shippedLabel?.en ?? "",
            role: role?.en ?? "",
            heroImage: row.heroImage,
            blocks: await getDocumentBlocks(row.caseStudyDocumentId),
        }
        : null;

    const hasTranslation = summary.ru !== "" || row.caseStudyDocumentIdRu !== null
        || Boolean(startedLabel?.ru) || Boolean(shippedLabel?.ru) || Boolean(role?.ru);

    return {
        slug: row.slug,
        title: row.title,
        year: row.year,
        status: row.status as WorkStatus,
        summary: summary.en,
        stack: row.stack,
        coverImage: row.coverImage,
        featured: row.featured,
        relatedPostSlug: row.relatedPostSlug,
        caseStudy,
        translation: hasTranslation
            ? {
                summary: summary.ru,
                startedLabel: startedLabel?.ru ?? "",
                shippedLabel: shippedLabel?.ru ?? "",
                role: role?.ru ?? "",
                blocks: row.caseStudyDocumentIdRu ? await getDocumentBlocks(row.caseStudyDocumentIdRu) : [],
            }
            : null,
    };
}

/** Work's half of `admin-posts.ts`'s `mergePostDraftInput` — same "explicit per-field merge, never a naive spread" reasoning (`input.slug`/`input.relatedPostSlug`/`input.coverImage` are all `undefined`-when-unset). */
function mergeWorkDraftInput(base: WorkDraftData, input: WorkInput): WorkDraftData {
    return {
        slug: input.slug ?? base.slug,
        title: input.title,
        year: input.year,
        status: input.status,
        summary: input.summary,
        stack: input.stack,
        coverImage: input.coverImage ?? null,
        featured: input.featured,
        relatedPostSlug: input.relatedPostSlug ?? null,
        caseStudy: input.caseStudy,
        translation: base.translation,
    };
}

/** Work's half of `admin-posts.ts`'s `toEffectiveSummary` — draft-priority for every field a draft can change (including `summary.ru`, from a pending translation draft — same reasoning as the post equivalent), live for the rest. */
function toEffectiveSummary(row: WorkRow, data: WorkDraftData): WorkSummary {
    const base = toWorkSummary(row);
    return {
        ...base,
        title: data.title,
        year: data.year,
        status: data.status,
        summary: { en: data.summary, ru: data.translation?.summary ?? base.summary.ru },
        stack: data.stack,
        coverImage: data.coverImage ?? null,
        featured: data.featured,
        relatedPostSlug: data.relatedPostSlug ?? null,
        hasCaseStudy: data.caseStudy !== null,
    };
}

async function readWorkDraft(entityId: string): Promise<WorkDraftData | null> {
    const raw = await readDraft(KIND, entityId);
    return raw === null ? null : workDraftDataSchema.parse(raw);
}

/**
 * Every work item, BOTH lifecycle states, newest first — the admin-only
 * counterpart to the public `getAllWork()` (work.ts). One extra
 * `ContentDraft` query for every row at once (`readDraftsFor`), same
 * reasoning as `admin-posts.ts`'s `getPostsForAdmin`.
 */
export async function getWorkForAdmin(): Promise<AdminWorkListItem[]> {
    const rows = await prisma.work.findMany({ orderBy: { year: "desc" } });
    const drafts = await readDraftsFor(KIND, rows.map((row) => row.id));
    return rows.map((row) => {
        const rawDraft = drafts.get(row.id);
        const draft = rawDraft === undefined ? null : workDraftDataSchema.parse(rawDraft);
        const summary = draft ? toEffectiveSummary(row, draft) : toWorkSummary(row);
        return { ...summary, hasUnpublishedChanges: draft !== null };
    });
}

/**
 * Admin-only single-item read, BOTH lifecycle states, EFFECTIVE
 * (draft-priority) content — see admin-posts.ts's `getPostForAdmin` for
 * the equivalent reasoning on `Post`.
 */
export async function getWorkDetailForAdmin(slug: string): Promise<AdminWorkDetail | null> {
    const row = await prisma.work.findUnique({ where: { slug } });
    if (!row) {
        return null;
    }

    const draft = await readWorkDraft(row.id);
    const data = draft ?? (await materializeDraft(row));

    return {
        ...toEffectiveSummary(row, data),
        draftSlug: data.slug ?? row.slug,
        caseStudy: data.caseStudy
            ? {
                startedLabel: { en: data.caseStudy.startedLabel, ru: data.translation?.startedLabel ?? "" },
                shippedLabel: { en: data.caseStudy.shippedLabel, ru: data.translation?.shippedLabel ?? "" },
                role: { en: data.caseStudy.role, ru: data.translation?.role ?? "" },
                heroImage: data.caseStudy.heroImage ?? null,
                blocks: toDisplayBlocks(data.caseStudy.blocks),
            }
            : null,
        hasUnpublishedChanges: draft !== null,
    };
}

/**
 * Work's half of `admin-posts.ts`'s `getPostPreview` — same reasoning,
 * same public-preview use case, same locale-resolution rule (Russian
 * draft/live case-study blocks if `locale === "ru"` and a translation
 * actually exists, English otherwise), reshaped into `WorkDetail`'s
 * public `caseStudy: CaseStudy | null` shape.
 */
export async function getWorkPreview(slug: string, locale: ContentLocale = "en"): Promise<WorkDetail | null> {
    const row = await prisma.work.findUnique({ where: { slug } });
    if (!row) {
        return null;
    }

    const data = (await readWorkDraft(row.id)) ?? (await materializeDraft(row));
    const summary = toEffectiveSummary(row, data);
    if (!data.caseStudy) {
        return { ...summary, caseStudy: null };
    }

    const useRuBlocks = locale === "ru" && data.translation;
    return {
        ...summary,
        caseStudy: {
            startedLabel: { en: data.caseStudy.startedLabel, ru: data.translation?.startedLabel ?? "" },
            shippedLabel: { en: data.caseStudy.shippedLabel, ru: data.translation?.shippedLabel ?? "" },
            role: { en: data.caseStudy.role, ru: data.translation?.role ?? "" },
            heroImage: data.caseStudy.heroImage ?? null,
            blocks: toDisplayBlocks(useRuBlocks ? data.translation!.blocks : data.caseStudy.blocks),
        },
    };
}

async function assertSlugAvailable(slug: string, excludingCurrentSlug?: string): Promise<void> {
    if (slug === excludingCurrentSlug) {
        return;
    }
    const existing = await prisma.work.findUnique({ where: { slug } });
    if (existing) {
        throw new SlugAlreadyExistsError(slug);
    }
}

async function isSlugTaken(slug: string): Promise<boolean> {
    return (await prisma.work.findUnique({ where: { slug }, select: { slug: true } })) !== null;
}

/**
 * English content only — same convention as `admin-posts.ts`'s
 * `createPost`. The ONE write path that still touches the live `Work` row
 * directly without going through `ContentDraft` — same reasoning as
 * `createPost`'s equivalent comment: the very first autosave has to
 * create something to attach a draft to.
 */
export async function createWork(input: WorkInput): Promise<WorkSummary> {
    const slug = input.slug ?? (await generateUniqueSlug(input.title, isSlugTaken));
    await assertSlugAvailable(slug);

    const caseStudyDocumentId = await replaceDocumentContent(null, input.caseStudy?.blocks ?? []);
    const row = await prisma.work.create({
        data: {
            slug,
            title: input.title,
            year: input.year,
            status: input.status,
            summary: { en: input.summary, ru: "" },
            stack: input.stack,
            coverImage: input.coverImage ?? null,
            featured: input.featured,
            relatedPostSlug: input.relatedPostSlug ?? null,
            startedLabel: input.caseStudy ? { en: input.caseStudy.startedLabel, ru: "" } : undefined,
            shippedLabel: input.caseStudy ? { en: input.caseStudy.shippedLabel, ru: "" } : undefined,
            role: input.caseStudy ? { en: input.caseStudy.role, ru: "" } : undefined,
            heroImage: input.caseStudy?.heroImage ?? null,
            caseStudyDocumentId,
        },
    });
    // See `createPost`'s comment on the same line — claimed only after
    // creation actually succeeds, not upfront.
    await claimSlug("work", slug);

    return toWorkSummary(row);
}

/**
 * The autosave write path for every save after a work item already
 * exists — same reasoning, same fix as `admin-posts.ts`'s
 * `savePostDraft`: never touches the live `Work` row, only upserts a
 * `ContentDraft`. `null` when `slug` (always the LIVE slug) doesn't
 * exist.
 */
export async function saveWorkDraft(slug: string, input: WorkInput): Promise<WorkSummary | null> {
    const existing = await prisma.work.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    const base = (await readWorkDraft(existing.id)) ?? (await materializeDraft(existing));
    const next = mergeWorkDraftInput(base, input);
    await saveDraft(KIND, existing.id, next);

    return toEffectiveSummary(existing, next);
}

/** Work's half of `admin-posts.ts`'s `applyPostDraftToRow` — called ONLY by `publishWork`. */
async function applyWorkDraftToRow(
    existing: WorkRow,
    data: WorkDraftData,
    lifecycle: { lifecycleState: LifecycleState; publishedAt: Date | null; contentUpdatedAt: Date | null },
): Promise<{ row: WorkRow; previousSlug: string | null }> {
    const newSlug = data.slug ?? existing.slug;
    await assertSlugAvailable(newSlug, existing.slug);

    const existingSummary = localizedTextSchema.parse(existing.summary);
    const caseStudyDocumentId = await replaceDocumentContent(existing.caseStudyDocumentId, data.caseStudy?.blocks ?? []);

    // Clearing the case study entirely drops its Russian translation too
    // — there's no English case study left for a Russian one to be "a
    // translation of" anymore. Same behavior the pre-draft-split
    // `updateWork` already had.
    let caseStudyDocumentIdRu: string | null = existing.caseStudyDocumentIdRu;
    if (!data.caseStudy && caseStudyDocumentIdRu) {
        await prisma.document.delete({ where: { id: caseStudyDocumentIdRu } }); // cascades to Block rows
        caseStudyDocumentIdRu = null;
    }

    const existingStarted = existing.startedLabel ? localizedTextSchema.parse(existing.startedLabel) : null;
    const existingShipped = existing.shippedLabel ? localizedTextSchema.parse(existing.shippedLabel) : null;
    const existingRole = existing.role ? localizedTextSchema.parse(existing.role) : null;

    // No pending translation edit ⇒ keep whatever's already live.
    let startedRu = existingStarted?.ru ?? "";
    let shippedRu = existingShipped?.ru ?? "";
    let roleRu = existingRole?.ru ?? "";
    if (data.caseStudy && data.translation) {
        startedRu = data.translation.startedLabel;
        shippedRu = data.translation.shippedLabel;
        roleRu = data.translation.role;
        caseStudyDocumentIdRu = await replaceDocumentContent(caseStudyDocumentIdRu, data.translation.blocks);
    }

    const updateData: Prisma.WorkUncheckedUpdateInput = {
        slug: newSlug,
        title: data.title,
        year: data.year,
        status: data.status,
        summary: { en: data.summary, ru: data.translation?.summary ?? existingSummary.ru },
        stack: data.stack,
        coverImage: data.coverImage ?? null,
        featured: data.featured,
        relatedPostSlug: data.relatedPostSlug ?? null,
        startedLabel: data.caseStudy ? { en: data.caseStudy.startedLabel, ru: startedRu } : Prisma.JsonNull,
        shippedLabel: data.caseStudy ? { en: data.caseStudy.shippedLabel, ru: shippedRu } : Prisma.JsonNull,
        role: data.caseStudy ? { en: data.caseStudy.role, ru: roleRu } : Prisma.JsonNull,
        heroImage: data.caseStudy?.heroImage ?? null,
        caseStudyDocumentId,
        caseStudyDocumentIdRu,
        // See `Work.contentUpdatedAt` in schema.prisma, and
        // `applyPostDraftToRow`'s identical comment (admin-posts.ts) for why
        // the caller decides this rather than always stamping "now".
        contentUpdatedAt: lifecycle.contentUpdatedAt,
        lifecycleState: lifecycle.lifecycleState,
        publishedAt: lifecycle.publishedAt,
    };
    const row = await prisma.work.update({ where: { slug: existing.slug }, data: updateData });

    if (newSlug !== existing.slug) {
        // See `applyPostDraftToRow`'s identical comment — same reasoning.
        await claimSlug("work", newSlug);
    }

    // Before announcing — see `applyPostDraftToRow`'s comment on the ordering.
    await recordSlugChange("work", existing.slug, newSlug);

    return { row, previousSlug: newSlug === existing.slug ? null : existing.slug };
}

/**
 * `DRAFT → PUBLISHED`, or "apply the current draft to an already-PUBLISHED
 * item" — see admin-posts.ts's `publishPost` for the full reasoning (no
 * request body, validates the EFFECTIVE content, snapshots the previous
 * live content only if it WAS already live, idempotent and
 * `publishedAt`-preserving when already published). `null` when `slug`
 * doesn't exist.
 */
export async function publishWork(slug: string): Promise<WorkSummary | null> {
    const existing = await prisma.work.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    // Same "Update with nothing pending is a real no-op" short-circuit as
    // `admin-posts.ts`'s `publishPost` — see its own comment.
    const draft = await readWorkDraft(existing.id);
    const wasAlreadyPublished = existing.lifecycleState === "PUBLISHED";
    if (wasAlreadyPublished && !draft) {
        return toWorkSummary(existing);
    }

    const data = draft ?? (await materializeDraft(existing));

    workPublishSchema.parse({
        slug: data.slug ?? existing.slug,
        title: data.title,
        year: data.year,
        status: data.status,
        summary: data.summary,
        stack: data.stack,
        coverImage: data.coverImage ?? null,
        featured: data.featured,
        relatedPostSlug: data.relatedPostSlug ?? null,
        caseStudy: data.caseStudy,
    });

    if (wasAlreadyPublished) {
        await snapshotRevision(KIND, existing.id, await materializeDraft(existing), existing.publishedAt ?? existing.createdAt);
    }

    const { row, previousSlug } = await applyWorkDraftToRow(existing, data, {
        lifecycleState: nextState(existing.lifecycleState, "PUBLISH"),
        publishedAt: wasAlreadyPublished ? existing.publishedAt : new Date(),
        // See `publishPost`'s identical comment (admin-posts.ts).
        contentUpdatedAt: draft ? new Date() : existing.contentUpdatedAt,
    });
    await discardDraft(KIND, existing.id);

    const published = toWorkSummary(row);
    announceWorkChange(published, { wasPublic: wasAlreadyPublished, isPublic: true, previousSlug });
    return published;
}

/** `PUBLISHED → DRAFT` — see admin-posts.ts's `unpublishPost` for the full reasoning. `null` when `slug` doesn't exist; throws `InvalidLifecycleTransitionError` if already DRAFT. */
export async function unpublishWork(slug: string): Promise<WorkSummary | null> {
    const existing = await prisma.work.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    const row = await prisma.work.update({
        where: { slug },
        data: { lifecycleState: nextState(existing.lifecycleState, "UNPUBLISH") },
    });

    const summary = toWorkSummary(row);
    announceWorkChange(summary, { wasPublic: true, isPublic: false, previousSlug: null });
    return summary;
}

/** `null` when `slug` doesn't exist — what `/admin/work/[slug]/translate` loads before rendering. Same "EFFECTIVE English reference" reasoning as `admin-posts.ts`'s `getPostTranslationForAdmin`. */
export async function getWorkTranslationForAdmin(slug: string): Promise<AdminWorkTranslation | null> {
    const row = await prisma.work.findUnique({ where: { slug } });
    if (!row) {
        return null;
    }

    const data = (await readWorkDraft(row.id)) ?? (await materializeDraft(row));
    const translation = data.translation;
    const empty: LocalizedText = { en: "", ru: "" };

    return {
        slug: row.slug,
        summary: { en: data.summary, ru: translation?.summary ?? "" },
        hasCaseStudy: data.caseStudy !== null,
        startedLabel: data.caseStudy ? { en: data.caseStudy.startedLabel, ru: translation?.startedLabel ?? "" } : empty,
        shippedLabel: data.caseStudy ? { en: data.caseStudy.shippedLabel, ru: translation?.shippedLabel ?? "" } : empty,
        role: data.caseStudy ? { en: data.caseStudy.role, ru: translation?.role ?? "" } : empty,
        caseStudyBlocks: toDisplayBlocks(translation?.blocks ?? []),
    };
}

/**
 * Writes the pending Russian translation into the item's `ContentDraft`
 * — never the live row (see admin-posts.ts's `translatePost` for the full
 * reasoning). `summary.ru` is stored (and later applied) UNCONDITIONALLY
 * — same as the pre-draft-split `translateWork` always did — a work item
 * can be translated on its `summary` alone with no case study at all,
 * they're independent. Only `startedLabel`/`shippedLabel`/`role`/`blocks`
 * are actually meaningless without a case study, and that's handled at
 * APPLY time (`applyWorkDraftToRow`'s own `data.caseStudy &&
 * data.translation` guard), not here — storing the whole
 * `TranslateWorkInput` as-is keeps this function from having to guess
 * what the case study will look like by the time this draft is
 * eventually published. `null` when `slug` doesn't exist.
 */
export async function translateWork(slug: string, input: TranslateWorkInput): Promise<WorkSummary | null> {
    const existing = await prisma.work.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    const base = (await readWorkDraft(existing.id)) ?? (await materializeDraft(existing));
    const next: WorkDraftData = { ...base, translation: input };
    await saveDraft(KIND, existing.id, next);

    return toEffectiveSummary(existing, next);
}

/** Every past PUBLISHED version of this item, newest first — `null` when `slug` doesn't exist. What `/admin/work/[slug]/history` lists. */
export async function listWorkRevisions(slug: string): Promise<RevisionSummary[] | null> {
    const existing = await prisma.work.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) {
        return null;
    }
    return listRevisions(KIND, existing.id);
}

/** "Load into draft" for a work item — see admin-posts.ts's `restorePostRevision` for the full reasoning. `null` when `slug` doesn't exist OR `revisionId` doesn't belong to this item. */
export async function restoreWorkRevision(slug: string, revisionId: string): Promise<AdminWorkDetail | null> {
    const existing = await prisma.work.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }
    const restored = await restoreRevisionToDraft(KIND, existing.id, revisionId);
    if (restored === null) {
        return null;
    }
    return getWorkDetailForAdmin(slug);
}

/** Discards the pending draft for a work item — see admin-posts.ts's `discardPostDraft` for the full reasoning. `null` when `slug` doesn't exist. */
export async function discardWorkDraft(slug: string): Promise<AdminWorkDetail | null> {
    const existing = await prisma.work.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) {
        return null;
    }
    await discardDraft(KIND, existing.id);
    return getWorkDetailForAdmin(slug);
}

/** `false` when `slug` doesn't exist — the API route turns that into a 404. */
export async function deleteWork(slug: string): Promise<boolean> {
    const existing = await prisma.work.findUnique({ where: { slug } });
    if (!existing) {
        return false;
    }

    // Work row first, then its case-study Document(s) — same ordering
    // reasoning as admin-posts.ts's `deletePost`.
    await prisma.work.delete({ where: { slug } });
    if (existing.caseStudyDocumentId) {
        await prisma.document.delete({ where: { id: existing.caseStudyDocumentId } }); // cascades to Block rows
    }
    if (existing.caseStudyDocumentIdRu) {
        await prisma.document.delete({ where: { id: existing.caseStudyDocumentIdRu } });
    }

    // See `deletePost`'s comment — a redirect to a deleted slug is worse
    // than a plain 404.
    await forgetSlugHistory("work", slug);
    await discardAllDraftHistory(KIND, existing.id);

    announceWorkChange(toWorkSummary(existing), {
        wasPublic: existing.lifecycleState === "PUBLISHED",
        isPublic: false,
        previousSlug: null,
    });
    return true;
}
