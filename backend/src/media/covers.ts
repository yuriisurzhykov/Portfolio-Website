import { prisma } from "../db/client";
import { isUniqueConstraintError } from "../errors";
import type { ContentLocale } from "../content/locale";
import { localizedTextSchema } from "../content/localized-text";
import { buildCoverBrief, CURRENT_COVER_STYLE_VERSION } from "./cover-brief";
import { sha256Hex } from "./content-hash";
import { hueForOrdinal } from "./cover-hue";
import { getImageGenerator } from "./image-generator";
import { fullVariantKey, narrowVariantKey, rasterizeCover } from "./image-processing";
import { getMediaStore } from "./media-store";

/**
 * The one file in this slice that knows both about the database AND about
 * the `ImageGenerator`/`MediaStore` ports — deliberately NOT in
 * `stryker.config.mjs`'s `mutate` list (see backend/stryker.config.mjs's
 * own top comment for why DB-backed files are excluded): its real
 * correctness is proven by `covers.test.ts`'s integration tests against a
 * real Postgres, same as `admin-posts.ts`/`work.ts`. Every genuinely pure
 * decision it depends on (hue math, palette, layout, hashing) already lives
 * in its own dedicated, unit-tested, mutation-tested module.
 */

/**
 * Normalizes an English category the same way everywhere a hue is looked
 * up or assigned — trimmed and lowercased, so "Kotlin" and "kotlin " share
 * one row/hue. Never the LOCALIZED category: a hue must not depend on the
 * reader's language, since a post's cover is one asset shared by both.
 */
function normalizeCategoryKey(categoryEn: string): string {
    return categoryEn.trim().toLowerCase();
}

/** The key an empty category is stored/looked up under — see `resolveCategoryHue`'s own comment for why this doesn't spend a real ordinal. */
const UNCATEGORIZED_KEY = "(uncategorized)";
/** Fixed, never derived from `hueForOrdinal` — a calm, desaturated-reading blue-violet that doesn't collide with any assignable hue family in practice. */
const UNCATEGORIZED_HUE = 250;

/**
 * Resolves the hue for `(kind, key)`, assigning one (and persisting the
 * assignment) the first time this identity is ever seen — see
 * `backend/src/media/README.md`'s "Назначение тона категории" entry for why
 * this has to be a stored, ordinal-based assignment and cannot be a pure
 * hash of the key string. The single entry point behind `resolveCategoryHue`
 * (`kind: "category"`) and `resolveWorkHue` (`kind: "work"`) — the ordinal
 * counter (`IdentityHue.ordinal`, `@unique` across ALL kinds, not scoped per
 * kind) is what guarantees a Work project and a post category can never
 * collide on the same hue, added 2026-08-11 (Work Item Covers & Unified
 * Identity Hue) when this replaced the Post-only `CategoryHue` table.
 *
 * Race-safe: `IdentityHue`'s `(kind, key)` pair is `@unique` (schema.prisma),
 * and a lost race on the INSERT (two concurrent first-sight requests for the
 * same brand-new identity) re-reads the winning row rather than retrying —
 * whichever ordinal actually landed is authoritative, not whichever request
 * computed one first. This app has a single admin (no concurrent-write load
 * to optimize for — same reasoning `admin-posts.ts`'s `assertSlugAvailable`
 * gives for its own check-then-act gap), so this is defense in depth, not a
 * load-bearing guarantee.
 */
export async function resolveIdentityHue(kind: string, key: string): Promise<number> {
    const existing = await prisma.identityHue.findUnique({ where: { kind_key: { kind, key } } });
    if (existing) {
        return existing.hue;
    }

    const highest = await prisma.identityHue.aggregate({ _max: { ordinal: true } });
    const ordinal = (highest._max.ordinal ?? -1) + 1;
    const hue = hueForOrdinal(ordinal);

    try {
        const created = await prisma.identityHue.create({ data: { kind, key, hue, ordinal } });
        return created.hue;
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            const winner = await prisma.identityHue.findUnique({ where: { kind_key: { kind, key } } });
            if (winner) {
                return winner.hue;
            }
        }
        throw error;
    }
}

/** Post-category half of `resolveIdentityHue` — behavior unchanged from before the 2026-08-11 `CategoryHue` → `IdentityHue` rename (same empty-category short-circuit, same normalization), now delegating its actual find-or-assign logic to the shared function. */
export async function resolveCategoryHue(categoryEn: string): Promise<number> {
    const key = normalizeCategoryKey(categoryEn);
    if (key === "") {
        // Doesn't spend an ordinal — an empty category isn't a real,
        // nameable category some future post might want to visually match;
        // see schema.prisma's comment on `IdentityHue`.
        return UNCATEGORIZED_HUE;
    }
    return resolveIdentityHue("category", key);
}

/** Work's own guaranteed-unique identity — `slug` IS the key, unlike a category there's no normalization step: a Work item's identity is the item itself, not a free-text label two different projects could coincidentally share. */
export async function resolveWorkHue(workSlug: string): Promise<number> {
    return resolveIdentityHue("work", workSlug);
}

/**
 * The single hue entry point `generateCoverForPost`/`ensureCoverIsCurrent`
 * call — added 2026-08-11 alongside `resolveWorkHue` so a post linked to a
 * project (`Post.relatedWorkSlug`) visually matches that project's own
 * cover instead of computing an unrelated hue from its own category. Falls
 * back to the unchanged `resolveCategoryHue` when there's no link, or when
 * `relatedWorkSlug` points at a Work that doesn't actually exist (e.g. a
 * stale manually-typed slug from before `RelatedItemPicker` validated it) —
 * a dangling reference must degrade gracefully, not throw and block the
 * post's own cover generation.
 */
export async function resolvePostHue(post: { categoryEn: string; relatedWorkSlug?: string | null }): Promise<number> {
    if (post.relatedWorkSlug) {
        const work = await prisma.work.findUnique({ where: { slug: post.relatedWorkSlug }, select: { slug: true } });
        if (work) {
            return resolveWorkHue(work.slug);
        }
    }
    return resolveCategoryHue(post.categoryEn);
}

export interface CoverSourcePost {
    slug: string;
    /** English title/excerpt/category only — see `cover-brief.ts`'s own comment on why a cover is derived from the canonical English content, one asset shared by both locales. */
    titleEn: string;
    excerptEn: string;
    categoryEn: string;
    /** Feeds `resolvePostHue` — when set (and the referenced Work still exists), the cover's hue is inherited from that project instead of computed from `categoryEn`. Optional (defaults to no link) so callers/tests with no relevant Work don't need to spell out `null` every time. */
    relatedWorkSlug?: string | null;
    /** `Post.date` verbatim — see `cover-brief.ts`'s own comment on `CoverBrief.date`. */
    date: string;
    locale?: ContentLocale;
    /** Which layout attempt this is — omit for a brand-new post (defaults to 1 inside `buildCoverBrief`); a Phase 2 reroll action passes an incremented value. */
    variant?: number;
}

/**
 * A short hash of the text that actually shapes the v3 composition (flow
 * curves, waveform, letterform-fill, readable title) — used by
 * `ensureCoverIsCurrent` to detect "the title or excerpt changed" the same
 * way it already detects "the category changed" via hue. Both title AND
 * excerpt feed in (a `\0`-joined pair, not a naive concatenation, so
 * `("ab", "c")` and `("a", "bc")` never accidentally collide on the same
 * hash) — reuses `content-hash.ts`'s `sha256Hex`, no new hashing primitive.
 */
export function computeContentHash(titleEn: string, excerptEn: string): string {
    return sha256Hex(Buffer.from(`${ titleEn }\0${ excerptEn }`, "utf-8"));
}

/** Shared with `work-covers.ts` — same `MediaAsset` shape, one Post-cover generator and one Work-cover generator producing rows of it. */
export interface MediaAssetRow {
    id: string;
    contentHash: string;
    storageKey: string;
    mimeType: string;
    width: number;
    height: number;
    byteSize: number;
    placeholder: string;
    kind: string;
    generation: unknown;
    createdAt: Date;
}

/**
 * Generates (or, via content-hash dedup, reuses) a cover for `post` and
 * returns the persisted `MediaAsset` row. Does NOT attach it to a `Post` —
 * `createPost` (admin-posts.ts) does that as part of its own single insert,
 * so a post is never observably created without a cover already wired up.
 *
 * Dedup happens on the RASTERIZED bytes' hash, not the brief — two
 * different (slug, variant) pairs could in principle render to the exact
 * same pixels (unlikely, but not impossible with a small `spotCount` and a
 * coincidental seed collision), and `MediaAsset.contentHash`'s `@unique`
 * constraint is what actually defines "the same image," not the inputs
 * that happened to produce it.
 */
export async function generateCoverForPost(post: CoverSourcePost): Promise<MediaAssetRow> {
    const hue = await resolvePostHue(post);
    const brief = buildCoverBrief({
        slug: post.slug,
        title: post.titleEn,
        excerpt: post.excerptEn,
        category: post.categoryEn,
        hue,
        date: post.date,
        locale: post.locale,
        variant: post.variant,
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
            kind: "post-cover",
            // Extra keys (`model`/`prompt`) land in this SAME Json column in
            // Phase 3 — no migration, see schema.prisma's comment on
            // `MediaAsset.generation`.
            generation: {
                generator: generated.generatorId,
                styleVersion: brief.styleVersion,
                variant: brief.variant,
                seed: brief.seed,
                hue: brief.hue,
                // Lets `ensureCoverIsCurrent` detect a changed title/excerpt
                // the same way it already detects a changed category (via
                // `hue`) — see `computeContentHash`'s own comment.
                contentHash: computeContentHash(post.titleEn, post.excerptEn),
                svgSource: generated.source ?? null,
            },
        },
    });
}

/** Reads one numeric/string field back out of a `MediaAsset`'s untyped `Json` `generation` column defensively — a malformed/legacy value (or a field that didn't exist yet under an older `styleVersion`, like `contentHash`) reads back as `null`, which compares unequal to any real value and correctly forces a regeneration rather than silently keeping a cover that might not match. */
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
 * Keeps a post's cover in sync with its CURRENT category, title, excerpt,
 * AND rendering algorithm version — v1 of this function (then named
 * `ensureCoverMatchesCategory`) only compared `hue`, which was correct for
 * v1's mesh-gradient-only algorithm (category was the only thing that
 * shaped the composition at all). v3's organic algorithm ALSO shapes
 * itself around title/excerpt (flow-curve count, waveform, letterform-fill,
 * readable title text — see `cover-composition.ts`), so a title edit with
 * no category change now needs to regenerate the cover too, or the
 * readable-title layer would silently go stale relative to the post's real
 * title. `contentHash` (`computeContentHash`) is what detects that.
 *
 * `styleVersion` is compared too, for the same reason `backfill-post-covers.ts`
 * exists at all: bumping `CURRENT_COVER_STYLE_VERSION` (a whole-algorithm
 * change, like v1 → v3) should upgrade every existing cover the next time
 * ANY of these three functions' call sites runs, not require a brand-new
 * one-off script per future style bump.
 *
 * The original bug this function was created to fix (found live, by the
 * person using the editor, not by reading code — see `media/README.md`'s
 * dated entry) still applies to `hue`: `createPost` fires on the very
 * first autosave, almost always BEFORE the admin has typed a category
 * (title is filled in first), so a post's first cover is usually generated
 * against `categoryEn: ""`.
 *
 * Called ONLY from `applyPostDraftToRow` (via `publishPost`) — deliberately
 * NOT from `savePostDraft`. A first version of this rule DID call it from
 * `savePostDraft` too, reasoning "this is decor, not content, so the
 * draft/publish split doesn't apply" — that reasoning was wrong (see
 * `media/README.md`'s dated entry for the full story): `Post.coverAssetId`
 * is exactly what real readers of an already-published post see, so
 * updating it on every autosave reintroduced the exact bug the whole
 * draft/publish split exists to prevent.
 *
 * Cheap when nothing changed: `resolvePostHue` is at most one or two
 * indexed reads for an already-known category/Work, and comparing against
 * the cover's own stored `generation` fields avoids a wasted rasterization
 * + a pointless new `MediaAsset` row on every publish where nothing
 * relevant actually changed.
 */
export async function ensureCoverIsCurrent(currentCoverAssetId: string | null, post: CoverSourcePost): Promise<string> {
    const targetHue = await resolvePostHue(post);
    const targetContentHash = computeContentHash(post.titleEn, post.excerptEn);

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

    const asset = await generateCoverForPost(post);
    return asset.id;
}

/**
 * Regenerates a CANDIDATE cover for an already-existing post — reads its
 * current, LIVE English title/excerpt/category (never a pending draft; a
 * cover reflects what is actually published, not an in-progress edit), and
 * deliberately does NOT attach the result to the post. `setPostCover`
 * below is the separate, explicit "accept this one" step — see
 * `media/README.md`'s "Роуты" entry for why the HTTP layer keeps these two
 * actions apart even though today's admin UI has no reroll picker yet
 * (Phase 2) to choose between candidates.
 *
 * `variant` increments past whatever this post's CURRENT cover was
 * generated with (defaulting to 0 if none/unreadable), so repeated
 * regeneration keeps producing new layouts instead of looping back to an
 * identical one. `null` when `slug` doesn't exist.
 */
export async function regenerateCoverForPost(slug: string): Promise<MediaAssetRow | null> {
    const post = await prisma.post.findUnique({ where: { slug }, include: { cover: true } });
    if (!post) {
        return null;
    }

    const currentVariant = readVariant(post.cover?.generation);
    const title = localizedTextSchema.parse(post.title).en;
    const category = localizedTextSchema.parse(post.category).en;
    const excerpt = localizedTextSchema.parse(post.excerpt).en;

    return generateCoverForPost({
        slug: post.slug,
        titleEn: title,
        excerptEn: excerpt,
        categoryEn: category,
        relatedWorkSlug: post.relatedWorkSlug,
        date: post.date,
        variant: currentVariant + 1,
    });
}

/** Reads `generation.variant` back out of a `MediaAsset`'s untyped `Json` column defensively — this is admin-facing bookkeeping (picking the NEXT variant number), not a security or correctness boundary, so a malformed/legacy value degrades to `0` rather than throwing. */
function readVariant(generation: unknown): number {
    if (typeof generation === "object" && generation !== null && "variant" in generation) {
        const value = (generation as { variant: unknown }).variant;
        return typeof value === "number" && Number.isFinite(value) ? value : 0;
    }
    return 0;
}

/**
 * Attaches an already-generated `MediaAsset` (typically one produced by
 * `regenerateCoverForPost`) as `slug`'s live cover — the explicit "accept"
 * step, never invoked implicitly by generation itself. `false` when
 * `slug` or `assetId` doesn't exist.
 */
export async function setPostCover(slug: string, assetId: string): Promise<boolean> {
    const [post, asset] = await Promise.all([
        prisma.post.findUnique({ where: { slug }, select: { id: true } }),
        prisma.mediaAsset.findUnique({ where: { id: assetId }, select: { id: true } }),
    ]);
    if (!post || !asset) {
        return false;
    }
    await prisma.post.update({ where: { slug }, data: { coverAssetId: assetId } });
    return true;
}

/**
 * Clears `slug`'s cover, leaving it without one until the next accepted
 * regeneration — safe precisely because `PostSummary.cover` and every
 * renderer of it already treat `null` as a normal, non-error case (see that
 * field's own comment). `false` when `slug` doesn't exist.
 */
export async function clearPostCover(slug: string): Promise<boolean> {
    const post = await prisma.post.findUnique({ where: { slug }, select: { id: true } });
    if (!post) {
        return false;
    }
    await prisma.post.update({ where: { slug }, data: { coverAssetId: null } });
    return true;
}

export interface CoverImageData {
    src: string;
    srcNarrow: string;
    placeholder: string;
    width: number;
    height: number;
}

interface CoverAssetLike {
    storageKey: string;
    placeholder: string;
    width: number;
    height: number;
}

/**
 * The single place a `MediaAsset` becomes a servable pair of URLs —
 * `JournalListPage`, `JournalPreview`, and the post detail hero all call
 * this (indirectly, through `PostSummary.cover` — see `content/posts.ts`),
 * never `MediaStore.url()` directly, so a future storage-backend swap
 * (`media/README.md`'s "Хранилище" entry) only ever touches this one
 * function's internals.
 */
export function coverUrlFor(asset: CoverAssetLike | null | undefined): CoverImageData | null {
    if (!asset) {
        return null;
    }
    const store = getMediaStore();
    return {
        src: store.url(fullVariantKey(asset.storageKey)),
        srcNarrow: store.url(narrowVariantKey(asset.storageKey)),
        placeholder: asset.placeholder,
        width: asset.width,
        height: asset.height,
    };
}
