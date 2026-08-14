import { prisma } from "../db/client";
import type { ContentLocale } from "../content/locale";
import { localizedTextSchema } from "../content/localized-text";
import { buildCoverBrief, CURRENT_COVER_STYLE_VERSION } from "./cover-brief";
import { computeContentHash, type MediaAssetRow, resolveWorkHue } from "./covers";
import { getImageGenerator } from "./image-generator";
import { fullVariantKey, narrowVariantKey, rasterizeCover } from "./image-processing";
import { getMediaStore } from "./media-store";

/**
 * `Work`'s half of `covers.ts`'s `generateCoverForPost`/`ensureCoverIsCurrent`
 * — added 2026-08-11 (Work Item Covers & Unified Identity Hue) once the same
 * v3 "Organic" pipeline (`buildCoverComposition`/`renderCoverSvg`/
 * `rasterizeCover`/`MediaAsset` content-hash dedup) turned out to need zero
 * changes to serve a second content type: every layer already accepted a
 * plain title/excerpt/category-label/date, none of them ever imported
 * anything `Post`-shaped. Kept in its OWN file rather than folded into
 * `covers.ts` — that file's `resolveCategoryHue`/`resolvePostHue` already
 * cross-reference `Work` (for hue inheritance), and a Post module reaching
 * back to import a "WorkCover" symbol from a would-be combined file would
 * read backwards; two thin, content-type-specific files sharing the one
 * real generation engine (`image-generator.ts`) is the shape that matches
 * how `content/work.ts`/`content/posts.ts` already split, one level up.
 */

/** Work has no category — the stamp's label segment is a fixed word instead, per the plan's decision (a project's REF/date are still real per-item data; only the leading word is constant). */
const WORK_STAMP_LABEL = "Project";

export interface CoverSourceWork {
    slug: string;
    /** English title/summary only — same "one asset shared by both locales" reasoning as `CoverSourcePost.titleEn`, see that field's own comment. */
    titleEn: string;
    summaryEn: string;
    /** `Work.date` verbatim (`"YYYY-MM-DD"`) — read only by the stamp layer, never parsed/reformatted here, same as `CoverSourcePost.date`. */
    date: string;
    locale?: ContentLocale;
    /** Which layout attempt this is — omit for a brand-new item (defaults to 1 inside `buildCoverBrief`); a future reroll action would pass an incremented value. */
    variant?: number;
}

/**
 * Generates (or, via content-hash dedup, reuses) a cover for `work` and
 * returns the persisted `MediaAsset` row — exact mirror of
 * `generateCoverForPost`'s own comment, just for `Work`/`resolveWorkHue`
 * instead of `Post`/`resolvePostHue`. Does NOT attach it to a `Work` row;
 * `createWork`/`applyWorkDraftToRow` (admin-work.ts) do that, same
 * draft/publish-boundary reasoning as `Post`.
 */
export async function generateCoverForWork(work: CoverSourceWork): Promise<MediaAssetRow> {
    const hue = await resolveWorkHue(work.slug);
    const brief = buildCoverBrief({
        slug: work.slug,
        title: work.titleEn,
        excerpt: work.summaryEn,
        category: WORK_STAMP_LABEL,
        hue,
        date: work.date,
        locale: work.locale,
        variant: work.variant,
    });

    const generated = await getImageGenerator().generate(brief);
    const processed = await rasterizeCover(generated.bytes, generated.mimeType);

    const existing = await prisma.mediaAsset.findUnique({ where: { contentHash: processed.contentHash } });
    if (existing) {
        return existing;
    }

    const store = getMediaStore();
    const storageKey = `covers/${ processed.contentHash }`;
    await store.put(fullVariantKey(storageKey), processed.full.bytes, processed.mimeType);
    await store.put(narrowVariantKey(storageKey), processed.narrow.bytes, processed.mimeType);

    return prisma.mediaAsset.create({
        data: {
            contentHash: processed.contentHash,
            storageKey,
            mimeType: processed.mimeType,
            width: processed.width,
            height: processed.height,
            byteSize: processed.full.byteSize,
            placeholder: processed.placeholder,
            kind: "work-cover",
            generation: {
                generator: generated.generatorId,
                styleVersion: brief.styleVersion,
                variant: brief.variant,
                seed: brief.seed,
                hue: brief.hue,
                // `work.date` feeds the hash too, unlike Post's — see
                // `computeContentHash`'s own comment for why: the stamp
                // literally renders it, and it's the one field that stays
                // admin-editable after creation.
                contentHash: computeContentHash(work.titleEn, work.summaryEn, work.date),
                svgSource: generated.source ?? null,
            },
        },
    });
}

function readGenerationField(generation: unknown, field: string): unknown {
    if (typeof generation === "object" && generation !== null && field in generation) {
        return (generation as Record<string, unknown>)[field];
    }
    return null;
}

function readHue(generation: unknown): number | null {
    const value = readGenerationField(generation, "hue");
    return typeof value === "number" ? value : null;
}

function readContentHash(generation: unknown): string | null {
    const value = readGenerationField(generation, "contentHash");
    return typeof value === "string" ? value : null;
}

function readStyleVersion(generation: unknown): number | null {
    const value = readGenerationField(generation, "styleVersion");
    return typeof value === "number" ? value : null;
}

/**
 * Keeps a Work item's cover in sync with its CURRENT title/summary/date
 * and rendering algorithm version — mirrors `ensureCoverIsCurrent`'s own
 * comment, plus `date` (folded into `targetContentHash`, see
 * `computeContentHash`'s own comment for why Work needs this and Post
 * doesn't): unlike `Post.date`, `Work.date` stays admin-editable after
 * creation, and the stamp layer renders it, so a date-only edit has to
 * regenerate the cover too, not just a title/excerpt edit. `hue` itself
 * basically never changes for an existing Work (its identity IS its slug
 * — `resolveWorkHue` only assigns a genuinely new ordinal the first time a
 * slug is seen), but the comparison still checks it for the same reason
 * `ensureCoverIsCurrent` does: cheap, and correct if a future admin action
 * ever lets a Work's hue be reassigned.
 *
 * Called ONLY from `applyWorkDraftToRow` (via `publishWork`) — deliberately
 * NOT from `saveWorkDraft`, same draft/publish-boundary rule as `Post`'s
 * `ensureCoverIsCurrent` (see that function's own comment for the real bug
 * this rule prevents).
 */
export async function ensureWorkCoverIsCurrent(currentCoverAssetId: string | null, work: CoverSourceWork): Promise<string> {
    const targetHue = await resolveWorkHue(work.slug);
    const targetContentHash = computeContentHash(work.titleEn, work.summaryEn, work.date);

    if (currentCoverAssetId) {
        const current = await prisma.mediaAsset.findUnique({
            where: { id: currentCoverAssetId },
            select: { generation: true },
        });
        if (
            current
            && readHue(current.generation) === targetHue
            && readContentHash(current.generation) === targetContentHash
            && readStyleVersion(current.generation) === CURRENT_COVER_STYLE_VERSION
        ) {
            return currentCoverAssetId;
        }
    }

    const asset = await generateCoverForWork(work);
    return asset.id;
}

/** Reads `generation.variant` back out of a `MediaAsset`'s untyped `Json` column defensively — same reasoning as `covers.ts`'s identical helper for `Post`. */
function readVariant(generation: unknown): number {
    if (typeof generation === "object" && generation !== null && "variant" in generation) {
        const value = (generation as { variant: unknown }).variant;
        return typeof value === "number" && Number.isFinite(value) ? value : 0;
    }
    return 0;
}

/**
 * Regenerates a CANDIDATE cover for an already-existing Work item — reads
 * its current, LIVE English title/summary (never a pending draft), and
 * does NOT attach the result. Mirror of `regenerateCoverForPost`; kept for
 * API parity even though no admin "reroll" UI exists for Work yet (same as
 * Post's own reroll routes — see `media/README.md`'s "Роуты" entry).
 * `null` when `slug` doesn't exist.
 */
export async function regenerateCoverForWork(slug: string): Promise<MediaAssetRow | null> {
    const work = await prisma.work.findUnique({ where: { slug }, include: { cover: true } });
    if (!work) {
        return null;
    }

    const currentVariant = readVariant(work.cover?.generation);
    const title = localizedTextSchema.parse(work.title).en;
    const summary = localizedTextSchema.parse(work.summary).en;

    return generateCoverForWork({
        slug: work.slug,
        titleEn: title,
        summaryEn: summary,
        date: work.date,
        variant: currentVariant + 1,
    });
}
