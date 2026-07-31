import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/client";
import { SlugAlreadyExistsError } from "../errors";
import { type Block, blockInputSchema } from "./blocks";
import { getDocumentBlocks, replaceDocumentContent } from "./document";
import type { LifecycleState } from "./lifecycle";
import { nextState } from "./lifecycle";
import { localizedTextSchema, type LocalizedText } from "./localized-text";
import { generateUniqueSlug, slugSchema } from "./slug";
import { toWorkSummary, type WorkDetail, type WorkStatus, type WorkSummary } from "./work";

/**
 * Was true before the content lifecycle state machine (2026-07-31): the
 * public `getWorkBySlug` (work.ts) returned the full case study —
 * including blocks — regardless of `status`, so there was no gap for a
 * separate admin-only single-item read to close (unlike `Post`, see
 * `getPostForAdmin`'s comment). That's no longer the whole story —
 * `getWorkBySlug` now ALSO filters `lifecycleState: "PUBLISHED"` (it has
 * to: it's the function every public page calls), which means it returns
 * `null` for a DRAFT work item — exactly the item the admin edit screen
 * needs to open. `getWorkDetailForAdmin` below closes that gap, the same
 * way `getPostForAdmin` already did for `Post`. Left this paragraph as a
 * correction, not a silent rewrite — the original reasoning was right
 * for its time, the lifecycle feature is what invalidated it.
 *
 * The TRANSLATE screen still needs its own function regardless
 * (`getWorkTranslationForAdmin` below) — it needs the Russian case-study
 * blocks specifically, with NO fallback to English, which no other
 * function provides.
 */

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
 * `publishWork()` and `updateWork()`'s auto-unpublish safety net, never
 * for create/update input directly.
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
 * `generateUniqueSlug`, `slug.ts`). What `createWork`/`updateWork` accept
 * ALWAYS now, same reasoning as `postDraftInputSchema` above.
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
 * only written — see `translateWork`) when the item already has an
 * ENGLISH case study; a work item with none has nothing case-study-shaped
 * to translate, so the translate page simply hides that section and these
 * fields go unused rather than rejected — enforcing "no case study, no
 * case-study translation fields" at the schema level would need to know
 * about the existing row, which a pure input schema can't.
 */
export const translateWorkInputSchema = z.object({
    summary: z.string(),
    startedLabel: z.string(),
    shippedLabel: z.string(),
    role: z.string(),
    blocks: z.array(blockInputSchema),
});
export type TranslateWorkInput = z.infer<typeof translateWorkInputSchema>;

/** What `/admin/work/[slug]/translate` reads before rendering its form. */
export interface AdminWorkTranslation {
    slug: string;
    summary: LocalizedText;
    /** Whether there's an English case study at all to translate — drives whether the translate page shows the case-study section. */
    hasCaseStudy: boolean;
    startedLabel: LocalizedText;
    shippedLabel: LocalizedText;
    role: LocalizedText;
    /** The Russian case study's blocks — `[]` (not a fallback to English) when no translation exists yet, same reasoning as `AdminPostTranslation.blocks`. */
    caseStudyBlocks: Block[];
}

/**
 * Every work item, BOTH lifecycle states, newest first — the admin-only
 * counterpart to the public `getAllWork()` (work.ts), same reasoning and
 * naming pattern as admin-posts.ts's `getPostsForAdmin()`. Not pluralized
 * ("Work", not "WorksForAdmin") — matches this file's existing convention
 * of treating "work" as a collective noun (`getAllWork`, `WorkSummary[]`),
 * not "getWorksForAdmin".
 */
export async function getWorkForAdmin(): Promise<WorkSummary[]> {
    const rows = await prisma.work.findMany({ orderBy: { year: "desc" } });
    return rows.map(toWorkSummary);
}

/**
 * Admin-only single-item read, BOTH lifecycle states — see this file's
 * top comment for why this now has to exist (it didn't before the
 * content lifecycle state machine). Mirrors the public `getWorkBySlug`
 * exactly, minus the `lifecycleState: "PUBLISHED"` filter.
 */
export async function getWorkDetailForAdmin(slug: string): Promise<WorkDetail | null> {
    const row = await prisma.work.findUnique({ where: { slug } });
    if (!row) {
        return null;
    }

    let caseStudy: WorkDetail["caseStudy"] = null;
    if (row.caseStudyDocumentId) {
        caseStudy = {
            startedLabel: localizedTextSchema.parse(row.startedLabel),
            shippedLabel: localizedTextSchema.parse(row.shippedLabel),
            role: localizedTextSchema.parse(row.role),
            heroImage: row.heroImage,
            blocks: await getDocumentBlocks(row.caseStudyDocumentId),
        };
    }

    return { ...toWorkSummary(row), caseStudy };
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
 * English content only — `ru` starts as `""` (untranslated) on every
 * localized field, same convention as admin-posts.ts's `createPost`.
 * `lifecycleState` absent from `data` — same reasoning as `createPost`:
 * Prisma's `@default(DRAFT)` applies, `publishWork()` is the only path
 * that moves it to PUBLISHED.
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

    return toWorkSummary(row);
}

/**
 * `null` when `slug` (the work item being edited) doesn't exist.
 * English-only, same as `createWork` — preserves whatever `ru` a
 * translation may already have set on `summary`/`startedLabel`/
 * `shippedLabel`/`role` instead of overwriting it, exactly like
 * admin-posts.ts's `updatePost`. Clearing the case study entirely
 * (`caseStudy: null`) DOES drop the Russian case-study translation too
 * (`caseStudyDocumentIdRu`/label `ru` values) — there's no English case
 * study left for a Russian one to be "a translation of" anymore.
 * `input.slug` omitted keeps the current slug — see `updatePost`'s
 * comment for why.
 *
 * Auto-unpublish safety net — same mechanism, same reasoning as
 * `updatePost`'s (admin-posts.ts): a PUBLISHED item whose new content no
 * longer satisfies `workPublishSchema` is moved back to DRAFT as part of
 * this same update, never rejected.
 */
export async function updateWork(slug: string, input: WorkInput): Promise<WorkSummary | null> {
    const existing = await prisma.work.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    const newSlug = input.slug ?? existing.slug;
    await assertSlugAvailable(newSlug, slug);

    const existingSummary = localizedTextSchema.parse(existing.summary);
    const caseStudyDocumentId = await replaceDocumentContent(existing.caseStudyDocumentId, input.caseStudy?.blocks ?? []);

    let caseStudyDocumentIdRu: string | null = existing.caseStudyDocumentIdRu;
    if (!input.caseStudy && caseStudyDocumentIdRu) {
        await prisma.document.delete({ where: { id: caseStudyDocumentIdRu } }); // cascades to Block rows
        caseStudyDocumentIdRu = null;
    }

    const existingStarted = existing.startedLabel ? localizedTextSchema.parse(existing.startedLabel) : null;
    const existingShipped = existing.shippedLabel ? localizedTextSchema.parse(existing.shippedLabel) : null;
    const existingRole = existing.role ? localizedTextSchema.parse(existing.role) : null;

    const stillPublishable = workPublishSchema.safeParse({
        slug: newSlug,
        title: input.title,
        year: input.year,
        status: input.status,
        summary: input.summary,
        stack: input.stack,
        coverImage: input.coverImage ?? null,
        featured: input.featured,
        relatedPostSlug: input.relatedPostSlug ?? null,
        caseStudy: input.caseStudy,
    }).success;
    const lifecycleState: LifecycleState =
        existing.lifecycleState === "PUBLISHED" && !stillPublishable ? "DRAFT" : existing.lifecycleState;

    const row = await prisma.work.update({
        where: { slug },
        data: {
            slug: newSlug,
            title: input.title,
            year: input.year,
            status: input.status,
            summary: { ...existingSummary, en: input.summary },
            stack: input.stack,
            coverImage: input.coverImage ?? null,
            featured: input.featured,
            relatedPostSlug: input.relatedPostSlug ?? null,
            startedLabel: input.caseStudy
                ? { en: input.caseStudy.startedLabel, ru: existingStarted?.ru ?? "" }
                : Prisma.JsonNull,
            shippedLabel: input.caseStudy
                ? { en: input.caseStudy.shippedLabel, ru: existingShipped?.ru ?? "" }
                : Prisma.JsonNull,
            role: input.caseStudy
                ? { en: input.caseStudy.role, ru: existingRole?.ru ?? "" }
                : Prisma.JsonNull,
            heroImage: input.caseStudy?.heroImage ?? null,
            caseStudyDocumentId,
            caseStudyDocumentIdRu,
            lifecycleState,
        },
    });

    return toWorkSummary(row);
}

/**
 * `DRAFT → PUBLISHED` — see admin-posts.ts's `publishPost` for the full
 * reasoning (no request body, validates the DB row, throws a plain
 * `ZodError` on missing fields, idempotent and `publishedAt`-preserving
 * when already published). `null` when `slug` doesn't exist.
 */
export async function publishWork(slug: string): Promise<WorkSummary | null> {
    const existing = await prisma.work.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    const summary = localizedTextSchema.parse(existing.summary);
    let caseStudy: z.infer<typeof caseStudyPublishSchema> | null = null;
    if (existing.caseStudyDocumentId) {
        caseStudy = {
            startedLabel: localizedTextSchema.parse(existing.startedLabel).en,
            shippedLabel: localizedTextSchema.parse(existing.shippedLabel).en,
            role: localizedTextSchema.parse(existing.role).en,
            heroImage: existing.heroImage,
            blocks: await getDocumentBlocks(existing.caseStudyDocumentId),
        };
    }
    workPublishSchema.parse({
        slug: existing.slug,
        title: existing.title,
        year: existing.year,
        status: existing.status,
        summary: summary.en,
        stack: existing.stack,
        coverImage: existing.coverImage,
        featured: existing.featured,
        relatedPostSlug: existing.relatedPostSlug,
        caseStudy,
    });

    const wasAlreadyPublished = existing.lifecycleState === "PUBLISHED";
    const row = await prisma.work.update({
        where: { slug },
        data: {
            lifecycleState: nextState(existing.lifecycleState, "PUBLISH"),
            publishedAt: wasAlreadyPublished ? existing.publishedAt : new Date(),
        },
    });
    return toWorkSummary(row);
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
    return toWorkSummary(row);
}

/** `null` when `slug` doesn't exist — what `/admin/work/[slug]/translate` loads before rendering. */
export async function getWorkTranslationForAdmin(slug: string): Promise<AdminWorkTranslation | null> {
    const row = await prisma.work.findUnique({ where: { slug } });
    if (!row) {
        return null;
    }

    const caseStudyBlocks = row.caseStudyDocumentIdRu ? await getDocumentBlocks(row.caseStudyDocumentIdRu) : [];
    const empty: LocalizedText = { en: "", ru: "" };

    return {
        slug: row.slug,
        summary: localizedTextSchema.parse(row.summary),
        hasCaseStudy: row.caseStudyDocumentId !== null,
        startedLabel: row.startedLabel ? localizedTextSchema.parse(row.startedLabel) : empty,
        shippedLabel: row.shippedLabel ? localizedTextSchema.parse(row.shippedLabel) : empty,
        role: row.role ? localizedTextSchema.parse(row.role) : empty,
        caseStudyBlocks,
    };
}

/**
 * The ONLY function that writes a Russian value for `summary`/
 * `startedLabel`/`shippedLabel`/`role`, or touches `caseStudyDocumentIdRu`.
 * `null` when `slug` doesn't exist. Silently leaves the case-study fields
 * untouched when the item has no English case study at all
 * (`existing.caseStudyDocumentId === null`) — mirrors
 * `translateWorkInputSchema`'s comment: there's nothing case-study-shaped
 * to translate yet, so submitting that section (even if the form sent
 * something) is a no-op rather than an error.
 */
export async function translateWork(slug: string, input: TranslateWorkInput): Promise<WorkSummary | null> {
    const existing = await prisma.work.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    const existingSummary = localizedTextSchema.parse(existing.summary);
    // `WorkUncheckedUpdateInput`, not `WorkUpdateInput` — this assigns the
    // raw `caseStudyDocumentIdRu` FK scalar directly (below) rather than
    // through a nested `caseStudyRu: { connect: ... }`, same as every
    // other function in this file already does for `caseStudyDocumentId`
    // (see `createWork`/`updateWork`) — `prisma.work.update()`'s `data`
    // parameter accepts either shape, but a variable declared with the
    // narrower `WorkUpdateInput` type alone would reject the raw scalar.
    const data: Prisma.WorkUncheckedUpdateInput = {
        summary: { ...existingSummary, ru: input.summary },
    };

    if (existing.caseStudyDocumentId) {
        const existingStarted = localizedTextSchema.parse(existing.startedLabel);
        const existingShipped = localizedTextSchema.parse(existing.shippedLabel);
        const existingRole = localizedTextSchema.parse(existing.role);

        data.startedLabel = { ...existingStarted, ru: input.startedLabel };
        data.shippedLabel = { ...existingShipped, ru: input.shippedLabel };
        data.role = { ...existingRole, ru: input.role };
        data.caseStudyDocumentIdRu = await replaceDocumentContent(existing.caseStudyDocumentIdRu, input.blocks);
    }

    const row = await prisma.work.update({ where: { slug }, data });
    return toWorkSummary(row);
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

    return true;
}
