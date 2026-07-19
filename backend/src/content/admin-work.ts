import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/client";
import { SlugAlreadyExistsError } from "../errors";
import { blockInputSchema, localizedTextSchema } from "./blocks";
import { replaceDocumentContent } from "./document";
import { slugSchema } from "./slug";
import { toWorkSummary, type WorkStatus, type WorkSummary } from "./work";

/**
 * Unlike `Post` (see admin-posts.ts's `getPostForAdmin`), `Work` needs no
 * separate admin-only read function at all: the public `getWorkBySlug`
 * (work.ts) already returns the full case study — including blocks —
 * regardless of `status`, and already returns `caseStudy: null` (not a
 * missing/null work item) for a work item that simply has no case study
 * yet. There's no "public read hides something the admin editor needs to
 * see" gap here the way there is for a post with no body document — so
 * the admin API route for "get one work item to edit" calls `getWorkBySlug`
 * directly instead of this module duplicating it under a different name.
 */

const caseStudyInputSchema = z.object({
    startedLabel: localizedTextSchema,
    shippedLabel: localizedTextSchema,
    role: localizedTextSchema,
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
    summary: localizedTextSchema,
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

async function assertSlugAvailable(slug: string, excludingCurrentSlug?: string): Promise<void> {
    if (slug === excludingCurrentSlug) {
        return;
    }
    const existing = await prisma.work.findUnique({ where: { slug } });
    if (existing) {
        throw new SlugAlreadyExistsError(slug);
    }
}

export async function createWork(input: WorkInput): Promise<WorkSummary> {
    await assertSlugAvailable(input.slug);

    const caseStudyDocumentId = await replaceDocumentContent(null, input.caseStudy?.blocks ?? []);
    const row = await prisma.work.create({
        data: {
            slug: input.slug,
            title: input.title,
            year: input.year,
            status: input.status,
            summary: input.summary,
            stack: input.stack,
            coverImage: input.coverImage ?? null,
            featured: input.featured,
            relatedPostSlug: input.relatedPostSlug ?? null,
            startedLabel: input.caseStudy?.startedLabel ?? undefined,
            shippedLabel: input.caseStudy?.shippedLabel ?? undefined,
            role: input.caseStudy?.role ?? undefined,
            heroImage: input.caseStudy?.heroImage ?? null,
            caseStudyDocumentId,
        },
    });

    return toWorkSummary(row);
}

/** `null` when `slug` (the work item being edited) doesn't exist. */
export async function updateWork(slug: string, input: WorkInput): Promise<WorkSummary | null> {
    const existing = await prisma.work.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    await assertSlugAvailable(input.slug, slug);

    const caseStudyDocumentId = await replaceDocumentContent(existing.caseStudyDocumentId, input.caseStudy?.blocks ?? []);
    const row = await prisma.work.update({
        where: { slug },
        data: {
            slug: input.slug,
            title: input.title,
            year: input.year,
            status: input.status,
            summary: input.summary,
            stack: input.stack,
            coverImage: input.coverImage ?? null,
            featured: input.featured,
            relatedPostSlug: input.relatedPostSlug ?? null,
            startedLabel: input.caseStudy?.startedLabel ?? Prisma.JsonNull,
            shippedLabel: input.caseStudy?.shippedLabel ?? Prisma.JsonNull,
            role: input.caseStudy?.role ?? Prisma.JsonNull,
            heroImage: input.caseStudy?.heroImage ?? null,
            caseStudyDocumentId,
        },
    });

    return toWorkSummary(row);
}

/** `false` when `slug` doesn't exist — the API route turns that into a 404. */
export async function deleteWork(slug: string): Promise<boolean> {
    const existing = await prisma.work.findUnique({ where: { slug } });
    if (!existing) {
        return false;
    }

    // Work row first, then its case-study Document — same ordering
    // reasoning as admin-posts.ts's `deletePost`.
    await prisma.work.delete({ where: { slug } });
    if (existing.caseStudyDocumentId) {
        await prisma.document.delete({ where: { id: existing.caseStudyDocumentId } }); // cascades to Block rows
    }

    return true;
}
