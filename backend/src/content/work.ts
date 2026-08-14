import { prisma } from "../db/client";
import type { Block } from "./blocks";
import { getDocumentBlocks } from "./document";
import type { LifecycleState } from "./lifecycle";
import { type LocalizedText, localizedTextSchema } from "./localized-text";
import type { ContentLocale } from "./locale";
import { uniqueTechSlugs } from "./tech-slug";
import { coverUrlFor, type CoverImageData } from "../media/covers";

export type WorkStatus = "shipped" | "in-progress";

export interface WorkSummary {
    slug: string;
    /** `{en, ru}` — localized 2026-08-11 (Work Item Covers & Unified Identity Hue); was a plain `string` (English only) before. */
    title: LocalizedText;
    /** `"YYYY-MM-DD"` — replaced `year: number` 2026-08-11. Unlike `Post.date`, stays admin-editable (see schema.prisma's comment on `Work.date`). */
    date: string;
    status: WorkStatus;
    summary: LocalizedText;
    stack: string[];
    coverImage: string | null;
    featured: boolean;
    relatedPostSlug: string | null;
    /**
     * The procedurally-generated cover — mirrors `PostSummary.cover`
     * exactly, added 2026-08-11 (Work Item Covers & Unified Identity Hue).
     * `null` for a Work item created before this feature shipped, until
     * `backfill-work-covers.ts` (or its own next publish) fills it in —
     * see `media/README.md`'s "Существующие посты" entry for the Post-side
     * precedent this mirrors.
     */
    cover: CoverImageData | null;
    /** Whether /work/:slug has a real case study, without fetching its blocks. */
    hasCaseStudy: boolean;
    /** Same field, same reasoning as `PostSummary.lifecycleState` (posts.ts) — Post and Work share one lifecycle graph (`content/lifecycle.ts`). */
    lifecycleState: LifecycleState;
    /** Mirrors `Work.publishedAt` — see schema.prisma's comment for why an UNPUBLISH never clears it. */
    publishedAt: string | null;
    /** Same field, same two consumers as `PostSummary.contentUpdatedAt` (posts.ts). */
    contentUpdatedAt: string | null;
    /**
     * Same meaning as `PostSummary.availableLocales` (posts.ts), derived
     * from a different column for a real reason: `translateWork` writes
     * `summary.ru` unconditionally but only writes `caseStudyDocumentIdRu`
     * when an English case study exists, so a Work item can be half
     * translated in a way a Post never can. Only the case-study document
     * answers "is there a Russian PAGE at `/ru/work/:slug`".
     */
    availableLocales: ContentLocale[];
}

export interface CaseStudy {
    startedLabel: LocalizedText;
    shippedLabel: LocalizedText;
    role: LocalizedText;
    heroImage: string | null;
    blocks: Block[];
}

export interface WorkDetail extends WorkSummary {
    caseStudy: CaseStudy | null;
}

interface RawWorkRow {
    slug: string;
    title: unknown;
    date: string;
    status: string;
    summary: unknown;
    stack: string[];
    coverImage: string | null;
    featured: boolean;
    relatedPostSlug: string | null;
    startedLabel: unknown;
    shippedLabel: unknown;
    role: unknown;
    heroImage: string | null;
    caseStudyDocumentId: string | null;
    caseStudyDocumentIdRu: string | null;
    lifecycleState: LifecycleState;
    publishedAt: Date | null;
    contentUpdatedAt: Date | null;
    /** Optional/possibly-`undefined` on purpose — same reasoning as `toPostSummary`'s identical `cover` field (posts.ts): a caller that queried `Work` without `include: { cover: true }` simply never has this key, and that's treated identically to "no cover". */
    cover?: { storageKey: string; placeholder: string; width: number; height: number } | null;
}

/** Exported for reuse by admin-work.ts (Phase 4) — same reasoning as posts.ts's `toPostSummary`. */
export function toWorkSummary(row: RawWorkRow): WorkSummary {
    return {
        slug: row.slug,
        title: localizedTextSchema.parse(row.title),
        date: row.date,
        status: row.status as WorkStatus,
        summary: localizedTextSchema.parse(row.summary),
        stack: row.stack,
        coverImage: row.coverImage,
        featured: row.featured,
        relatedPostSlug: row.relatedPostSlug,
        cover: coverUrlFor(row.cover),
        hasCaseStudy: row.caseStudyDocumentId !== null,
        lifecycleState: row.lifecycleState,
        publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
        contentUpdatedAt: row.contentUpdatedAt ? row.contentUpdatedAt.toISOString() : null,
        availableLocales: row.caseStudyDocumentIdRu !== null ? ["en", "ru"] : ["en"],
    };
}

/** Every PUBLISHED work item, newest first — the /work ledger. `where: { lifecycleState: "PUBLISHED" }` added 2026-07-31 (content lifecycle state machine); the admin-only equivalent that returns both lifecycle states is `admin-work.ts`'s `getWorkForAdmin()`. */
export async function getAllWork(): Promise<WorkSummary[]> {
    const rows = await prisma.work.findMany({where: {lifecycleState: "PUBLISHED"}, orderBy: {date: "desc"}, include: {cover: true}});
    return rows.map(toWorkSummary);
}

/** Only `featured: true` AND published items — the landing page's "Selected Work" grid. */
export async function getFeaturedWork(): Promise<WorkSummary[]> {
    const rows = await prisma.work.findMany({
        where: {featured: true, lifecycleState: "PUBLISHED"},
        orderBy: {date: "desc"},
        include: {cover: true},
    });
    return rows.map(toWorkSummary);
}

/**
 * Every distinct tech slug (`toTechSlug`) appearing in ANY published
 * item's `stack` — reads only the `stack` column, not full rows, same
 * reasoning as `posts.ts`'s `getDistinctPostCategories`. Lets the landing
 * page's tech-logo row decide whether a logo is a real link to
 * `/work?tech=...` or inert (no point linking to a filter that would show
 * zero results) without loading every `Work` row's full contents just to
 * check.
 */
export async function getPublishedTechSlugs(): Promise<string[]> {
    const rows = await prisma.work.findMany({
        where: { lifecycleState: "PUBLISHED" },
        select: { stack: true },
    });
    return uniqueTechSlugs(rows.map((row) => row.stack));
}

/**
 * Full work item, including its case study's blocks — null if the slug
 * doesn't exist OR the item is a DRAFT (`lifecycleState`, not visible on
 * the public site at all). `caseStudy` itself (not the whole return
 * value) is null for items that never had a case study (e.g. small
 * internal tools), same as the current site's `item.caseStudy` optional
 * field.
 *
 * `locale` picks which case-study `Document` to read blocks from — same
 * fallback reasoning as `posts.ts`'s `getPostBySlug`: `caseStudyDocumentIdRu`
 * for `"ru"`, falling back to the English `caseStudyDocumentId` when no
 * translation exists yet. The metadata fields (`startedLabel`/
 * `shippedLabel`/`role`) stay `{en, ru}` regardless — `pick()` resolves
 * those client-side, same as `title`/`summary`/etc.
 */
export async function getWorkBySlug(slug: string, locale: ContentLocale = "en"): Promise<WorkDetail | null> {
    const row = await prisma.work.findUnique({where: {slug}, include: {cover: true}});
    if (!row || row.lifecycleState !== "PUBLISHED") {
        return null;
    }

    let caseStudy: CaseStudy | null = null;
    const caseStudyDocumentId = (locale === "ru" ? row.caseStudyDocumentIdRu : null) ?? row.caseStudyDocumentId;
    if (caseStudyDocumentId) {
        caseStudy = {
            startedLabel: localizedTextSchema.parse(row.startedLabel),
            shippedLabel: localizedTextSchema.parse(row.shippedLabel),
            role: localizedTextSchema.parse(row.role),
            heroImage: row.heroImage,
            blocks: await getDocumentBlocks(caseStudyDocumentId),
        };
    }

    return {...toWorkSummary(row), caseStudy};
}
