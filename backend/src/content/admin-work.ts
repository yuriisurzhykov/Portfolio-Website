import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/client";
import { SlugAlreadyExistsError } from "../errors";
import { type Block, blockInputSchema } from "./blocks";
import { getDocumentBlocks, replaceDocumentContent } from "./document";
import { localizedTextSchema, type LocalizedText } from "./localized-text";
import { slugSchema } from "./slug";
import { toWorkSummary, type WorkStatus, type WorkSummary } from "./work";

/**
 * Unlike `Post` (see admin-posts.ts's `getPostForAdmin`), `Work` needs no
 * separate admin-only read function for its EDIT screen: the public
 * `getWorkBySlug` (work.ts) already returns the full case study —
 * including blocks — regardless of `status`, and already returns
 * `caseStudy: null` (not a missing/null work item) for a work item that
 * simply has no case study yet. There's no "public read hides something
 * the admin editor needs to see" gap here the way there is for a post
 * with no body document — so the admin API route for "get one work item
 * to edit" calls `getWorkBySlug` directly instead of this module
 * duplicating it under a different name. The TRANSLATE screen is
 * different — it needs the Russian case-study blocks specifically, with
 * NO fallback to English (see `getWorkTranslationForAdmin` below) — which
 * is exactly the gap `getPostForAdmin` exists to close for posts, so
 * `Work` gets the equivalent function too, just scoped to translation.
 */

/** English content only — same reasoning as `postInputSchema` (admin-posts.ts): the create/edit screen never touches `ru` at all, `translateWorkInputSchema` below is the only writer for it. */
const caseStudyInputSchema = z.object({
    startedLabel: z.string().min(1),
    shippedLabel: z.string().min(1),
    role: z.string().min(1),
    heroImage: z.string().nullish(),
    // Whole-document replace, not incremental block edits — see
    // document.ts's `replaceDocumentContent` for why.
    blocks: z.array(blockInputSchema),
});

export const workInputSchema = z.object({
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
    caseStudy: caseStudyInputSchema.nullable(),
});
export type WorkInput = z.infer<typeof workInputSchema>;

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

async function assertSlugAvailable(slug: string, excludingCurrentSlug?: string): Promise<void> {
    if (slug === excludingCurrentSlug) {
        return;
    }
    const existing = await prisma.work.findUnique({ where: { slug } });
    if (existing) {
        throw new SlugAlreadyExistsError(slug);
    }
}

/** English content only — `ru` starts as `""` (untranslated) on every localized field, same convention as admin-posts.ts's `createPost`. */
export async function createWork(input: WorkInput): Promise<WorkSummary> {
    await assertSlugAvailable(input.slug);

    const caseStudyDocumentId = await replaceDocumentContent(null, input.caseStudy?.blocks ?? []);
    const row = await prisma.work.create({
        data: {
            slug: input.slug,
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
 */
export async function updateWork(slug: string, input: WorkInput): Promise<WorkSummary | null> {
    const existing = await prisma.work.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    await assertSlugAvailable(input.slug, slug);

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

    const row = await prisma.work.update({
        where: { slug },
        data: {
            slug: input.slug,
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
        },
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
