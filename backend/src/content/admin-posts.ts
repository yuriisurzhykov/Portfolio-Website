import type { Post as PostRow } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/client";
import { SlugAlreadyExistsError } from "../errors";
import { ensureCoverMatchesCategory, generateCoverForPost } from "../media/covers";
import { blockInputSchema, type Block } from "./blocks";
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
import { estimateReadMins } from "./reading-time";
import { generateUniqueSlug, slugSchema } from "./slug";
import type { ContentLocale } from "./locale";
import { toPostSummary, type PostDetail, type PostStatus, type PostSummary } from "./posts";
import { notifyContentChanged } from "./content-change-notifier";
import { claimSlug, forgetSlugHistory, recordSlugChange } from "./slug-history";

/** The `ContentDraft`/`ContentRevision` polymorphic `kind` this whole file writes under — named once so a typo can't silently create a second, orphaned draft namespace. */
const KIND = "post" as const;

/**
 * One rule for every write path in this file: announce a change whenever
 * it touched a PUBLIC address — either the post is public now, or it was
 * public a moment ago and this operation took that away. Editing a draft
 * is deliberately silent: there is no address for a crawler to recheck,
 * and continuous autosave behind `savePostDraft` would otherwise turn a
 * writing session into a stream of notifications about a page nobody can
 * reach. Since the draft/publish split (see this file's own dated entry
 * in content/README.md), this is now ALSO true of publishing itself —
 * `publishPost` is the only place content actually reaches a public
 * address, so it's the only place besides `unpublishPost`/`deletePost`
 * that can ever flip `isPublic`.
 */
function announcePostChange(
    summary: PostSummary,
    options: { wasPublic: boolean; isPublic: boolean; previousSlug: string | null },
): void {
    if (!options.isPublic && !options.wasPublic) {
        return;
    }
    notifyContentChanged({
        kind: "post",
        slug: summary.slug,
        previousSlug: options.previousSlug,
        isPublic: options.isPublic,
        availableLocales: summary.availableLocales,
    });
}

/**
 * The STRICT contract — what a Post must satisfy to be shown on the public
 * site. Used in exactly two places: `publishPost()` (validates the
 * EFFECTIVE content about to become live — the draft if one exists,
 * otherwise the live row itself, see `materializeDraft` below) and, as a
 * `.safeParse()`-style readiness check nowhere anymore since the
 * auto-unpublish safety net was retired — see this file's dated entry in
 * content/README.md for why that net no longer has a job: a soft-shaped
 * save can no longer touch the live row at all, so there is nothing left
 * for it to protect.
 *
 * No `date`/`dateLabel`/`readMins` here at all — `date` is set once,
 * automatically, by `createPost` (never by the admin); `dateLabel` (a
 * free-text override for imprecise/upcoming dates) has been removed
 * outright; `readMins` is recomputed from `blocks` on every publish (see
 * `estimateReadMins`, `reading-time.ts`) — all three are things the
 * server derives, not things a form field (or a publish-readiness check)
 * should ask about.
 */
export const postPublishSchema = z.object({
    slug: slugSchema,
    title: z.string().min(1),
    category: z.string().min(1),
    excerpt: z.string().min(1),
    status: z.enum(["published", "upcoming"] satisfies PostStatus[]),
    relatedWorkSlug: z.string().nullish(),
    // Whole-document replace, not incremental block edits — see
    // document.ts's `replaceDocumentContent` for why. Validated here
    // against `Block[]` (the DB read shape, id/order included) as much as
    // `BlockInput[]` (the write shape) — `blockInputSchema`'s
    // `z.object()`/`z.discriminatedUnion()` strip unknown keys by
    // default, so a `Block[]` parses here just as validly with its extra
    // `id`/`order` fields silently ignored.
    blocks: z.array(blockInputSchema),
});

/**
 * The SOFT contract — everything except `title` is optional/defaults to
 * an empty value, `slug` may be omitted entirely (the server derives one
 * — see `generateUniqueSlug`, `slug.ts`). This is what the admin editor's
 * every autosave sends, and now (see this file's dated entry in
 * content/README.md) it ONLY ever lands in `savePostDraft` — never
 * directly in the live row, so there is no soft/strict distinction left
 * to enforce on write at all; the strict shape above is purely a
 * PUBLISH-time gate. `PostInput` (the type every caller outside this file
 * imports) is this schema's output type.
 */
export const postDraftInputSchema = z.object({
    slug: slugSchema.optional(),
    title: z.string().min(1),
    category: z.string().default(""),
    excerpt: z.string().default(""),
    status: z.enum(["published", "upcoming"] satisfies PostStatus[]).default("published"),
    relatedWorkSlug: z.string().nullish(),
    blocks: z.array(blockInputSchema).default([]),
});
export type PostInput = z.infer<typeof postDraftInputSchema>;

/**
 * The "Add translation"/"Edit translation" screen's write contract
 * (`/admin/journal/[slug]/translate` → `PUT /api/admin/posts/[slug]/translation`)
 * — deliberately only the fields that have a language-specific value at
 * all. `slug`/`date`/`readMins`/`status`/`relatedWorkSlug` aren't
 * translated, they're the same record either way, so they simply don't
 * appear here — there is no way to accidentally overwrite them from this
 * screen, not just a documented one. (`readMins` specifically: it's
 * derived from the ENGLISH body only — see `applyPostDraftToRow` — a
 * Russian translation being longer or shorter never changes it.)
 */
export const translatePostInputSchema = z.object({
    title: z.string(),
    category: z.string(),
    excerpt: z.string(),
    blocks: z.array(blockInputSchema),
});
export type TranslatePostInput = z.infer<typeof translatePostInputSchema>;

/**
 * The whole pending-edit payload persisted in `ContentDraft.data` for a
 * post — `PostInput` plus an optional pending Russian translation.
 * Translation moved in here (2026-08-09, draft/publish split) rather than
 * `translatePost` continuing to write the live row directly: a translator
 * clicking "Save translation" used to change what Russian readers saw
 * INSTANTLY, same underlying bug as autosave overwriting the English
 * live row — see content/README.md's dated entry. `null`/absent means
 * "no pending translation edit," NOT "no translation exists" — a post can
 * have a real, live Russian version while its `ContentDraft.translation`
 * is empty (nobody's touched the translation since the last publish).
 */
export const postDraftDataSchema = postDraftInputSchema.extend({
    translation: translatePostInputSchema.nullish(),
});
export type PostDraftData = z.infer<typeof postDraftDataSchema>;

export interface AdminPostDetail extends PostSummary {
    blocks: Block[];
    /**
     * The draft's pending slug, or `slug` itself when no rename is
     * pending — what the editor's Slug FIELD should show/edit. Distinct
     * from `slug` (always the LIVE, routing-stable value — `PostSummary`'s
     * usual meaning) because a rename typed into the editor doesn't take
     * effect until Publish/Update; the admin edit page's URL must keep
     * working against the OLD slug until then.
     */
    draftSlug: string;
    /** Whether a `ContentDraft` row exists for this post — i.e. there's pending content that Publish/Update hasn't applied yet. */
    hasUnpublishedChanges: boolean;
}

/** What `/admin/journal`'s list page renders — same as `PostSummary`, plus whether each row has a pending draft, so the list can show that without opening every post. */
export interface AdminPostListItem extends PostSummary {
    hasUnpublishedChanges: boolean;
}

/** What `/admin/journal/[slug]/translate` reads before rendering its form — full `{en, ru}` pairs (not just `ru`) so the page can show the English original next to the field the translator is filling in. */
export interface AdminPostTranslation {
    slug: string;
    title: LocalizedText;
    category: LocalizedText;
    excerpt: LocalizedText;
    /** The Russian body's blocks — `[]` (not a fallback to the English body) when no translation (published OR pending) exists yet; the translate page's editor should start empty, not silently pre-filled with English text as if it were already translated. */
    blocks: Block[];
}

/**
 * Builds the `PostDraftData` a post starts from when nobody has ever
 * autosaved a change to it since its last publish — i.e. "what's
 * currently live," reshaped into the exact same JSON shape a real draft
 * would have. Every admin-facing read (`getPostForAdmin`,
 * `getPostTranslationForAdmin`, `getPostsForAdmin`) and every write
 * (`savePostDraft`, `translatePost`, `publishPost`) that needs a base to
 * merge onto calls this when `readDraft` comes back empty — one place
 * that knows how to turn a `Post` row back into the draft shape, so the
 * "no draft yet" case can never drift from the "draft exists" case.
 */
async function materializeDraft(row: PostRow): Promise<PostDraftData> {
    const title = localizedTextSchema.parse(row.title);
    const category = localizedTextSchema.parse(row.category);
    const excerpt = localizedTextSchema.parse(row.excerpt);
    const blocks = row.bodyDocumentId ? await getDocumentBlocks(row.bodyDocumentId) : [];

    // A translation "exists" (for the purpose of what this materializes)
    // if there's a Russian body OR any Russian metadata — a post can be
    // half-translated (title.ru set, no body yet) the same way
    // `translatePost` always has allowed.
    const hasTranslation = row.bodyDocumentIdRu !== null || title.ru !== "" || category.ru !== "" || excerpt.ru !== "";

    return {
        slug: row.slug,
        title: title.en,
        category: category.en,
        excerpt: excerpt.en,
        status: row.status as PostStatus,
        relatedWorkSlug: row.relatedWorkSlug,
        blocks,
        translation: hasTranslation
            ? {
                title: title.ru,
                category: category.ru,
                excerpt: excerpt.ru,
                blocks: row.bodyDocumentIdRu ? await getDocumentBlocks(row.bodyDocumentIdRu) : [],
            }
            : null,
    };
}

/**
 * Merges a soft-shaped `PostInput` save onto whatever draft (or
 * materialized-live) data already existed — deliberately NOT a plain
 * `{ ...base, ...input }` object spread: `input.slug`/`input.relatedWorkSlug`
 * are `undefined`-when-unset (the soft schema's normal shape once a post
 * already exists), and a naive spread would overwrite `base.slug` with
 * `undefined` the moment the admin saves without having touched the slug
 * field — silently losing a previously-pending rename. `translation` is
 * never part of `input` at all (see `postDraftDataSchema`'s own comment),
 * so it always carries over from `base` untouched here; only
 * `translatePost` ever changes it.
 */
function mergePostDraftInput(base: PostDraftData, input: PostInput): PostDraftData {
    return {
        slug: input.slug ?? base.slug,
        title: input.title,
        category: input.category,
        excerpt: input.excerpt,
        status: input.status,
        relatedWorkSlug: input.relatedWorkSlug ?? null,
        blocks: input.blocks,
        translation: base.translation,
    };
}

/**
 * The EFFECTIVE `PostSummary` for a row + its (draft-or-materialized)
 * data — draft-priority for every field a draft can change (including
 * the `ru` side, from `data.translation` when a translation edit is
 * pending — e.g. so the editor's "Edit translation" vs "Add translation"
 * label reflects a translation that's been drafted but not published
 * yet, not just a already-live one), live for everything else
 * (`lifecycleState`/`publishedAt`/`contentUpdatedAt`/`availableLocales`,
 * none of which a draft ever touches). Reused by every admin read/write
 * below so "how a row + pending data becomes a summary" has exactly one
 * definition.
 */
function toEffectiveSummary(row: PostRow, data: PostDraftData): PostSummary {
    const base = toPostSummary(row);
    return {
        ...base,
        title: { en: data.title, ru: data.translation?.title ?? base.title.ru },
        category: { en: data.category, ru: data.translation?.category ?? base.category.ru },
        excerpt: { en: data.excerpt, ru: data.translation?.excerpt ?? base.excerpt.ru },
        status: data.status,
        relatedWorkSlug: data.relatedWorkSlug ?? null,
        hasBody: data.blocks.length > 0,
        // `Post.readMins` itself only updates on publish (`applyPostDraftToRow`
        // recomputes it from the content that's ACTUALLY going live) — but the
        // editor's "~N min read" display has to reflect the DRAFT's current
        // body, or it would keep showing a stale number while the admin is
        // still writing, same underlying bug class as everything else this
        // draft/publish split fixes.
        readMins: estimateReadMins(data.blocks),
    };
}

async function readPostDraft(entityId: string): Promise<PostDraftData | null> {
    const raw = await readDraft(KIND, entityId);
    return raw === null ? null : postDraftDataSchema.parse(raw);
}

/**
 * Every post, BOTH lifecycle states, newest first — what
 * `/admin/journal`'s list page renders (Draft/Published tabs filter this
 * client-side, see `AdminJournalListPage`), unlike the public
 * `getJournalEntries()` (posts.ts), which only ever returns PUBLISHED
 * rows. One extra `ContentDraft` query for every row at once
 * (`readDraftsFor`), not one per row — an admin's own post count is
 * small, but there's no reason to pay for N+1 anyway.
 */
export async function getPostsForAdmin(): Promise<AdminPostListItem[]> {
    const rows = await prisma.post.findMany({ orderBy: { date: "desc" } });
    const drafts = await readDraftsFor(KIND, rows.map((row) => row.id));
    return rows.map((row) => {
        const rawDraft = drafts.get(row.id);
        const draft = rawDraft === undefined ? null : postDraftDataSchema.parse(rawDraft);
        const summary = draft ? toEffectiveSummary(row, draft) : toPostSummary(row);
        return { ...summary, hasUnpublishedChanges: draft !== null };
    });
}

/**
 * Unlike the public `getPostBySlug` (posts.ts), never returns `null` just
 * because the post is a DRAFT or has no body document yet (an "upcoming"
 * stub with nothing written is still a perfectly valid thing for the
 * admin editor to open and add content to) — only `null` when the post
 * itself doesn't exist. Everything content-shaped is the EFFECTIVE
 * (draft-priority) view — see `toEffectiveSummary`/`materializeDraft`.
 */
export async function getPostForAdmin(slug: string): Promise<AdminPostDetail | null> {
    const row = await prisma.post.findUnique({ where: { slug } });
    if (!row) {
        return null;
    }

    const draft = await readPostDraft(row.id);
    const data = draft ?? (await materializeDraft(row));

    return {
        ...toEffectiveSummary(row, data),
        draftSlug: data.slug ?? row.slug,
        blocks: toDisplayBlocks(data.blocks),
        hasUnpublishedChanges: draft !== null,
    };
}

/**
 * What the public preview route (`/journal/[slug]?preview=1`) renders for
 * an authenticated admin — the same effective (draft-priority) content
 * `getPostForAdmin` shows, resolved to ONE locale's body (same fallback
 * rule as the public `getPostBySlug`: Russian draft/live blocks if
 * `locale === "ru"` and a translation actually exists, English
 * otherwise) so the preview can go through the exact same
 * `<JournalDetailPage>` component real readers eventually see. Returns
 * `null` only when the post doesn't exist at all — unlike the public
 * `getPostBySlug`, a DRAFT (never-published) post previews just fine,
 * that's the whole point of a preview.
 */
export async function getPostPreview(slug: string, locale: ContentLocale = "en"): Promise<PostDetail | null> {
    const row = await prisma.post.findUnique({ where: { slug }, include: { cover: true } });
    if (!row) {
        return null;
    }

    const data = (await readPostDraft(row.id)) ?? (await materializeDraft(row));
    const body = locale === "ru" && data.translation ? data.translation.blocks : data.blocks;
    return { ...toEffectiveSummary(row, data), body: toDisplayBlocks(body) };
}

/**
 * Checked up front (a cheap read) rather than only relying on catching the
 * database's unique-constraint error after the fact — that would happen
 * AFTER `replaceDocumentContent` already created a `Document`/`Block` rows
 * for the new body, leaking them once the `Post` insert then fails. This
 * app has a single admin editing sequentially (no concurrent-write load to
 * optimize for), so the tiny check-then-act race this leaves in theory
 * isn't worth threading a transactional Prisma client through
 * `replaceDocumentContent` to close.
 */
async function assertSlugAvailable(slug: string, excludingCurrentSlug?: string): Promise<void> {
    if (slug === excludingCurrentSlug) {
        return;
    }
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (existing) {
        throw new SlugAlreadyExistsError(slug);
    }
}

/**
 * English content only — `ru` starts as `""` (untranslated) on every
 * field, exactly what `pick()` (web) treats as "fall back to English"
 * until a translation is added. `date` is always "today" in the server's
 * own clock at the moment of creation — never taken from `input`, so
 * there's no way for the admin UI to backdate/postdate a post even by
 * accident.
 *
 * The ONE write path that still touches the live `Post` row directly
 * without going through `ContentDraft` at all — see content/README.md's
 * dated entry: the very first autosave (empty title → non-empty) has to
 * create SOMETHING to attach a draft to; every save after this one goes
 * through `savePostDraft` instead. `lifecycleState` is deliberately
 * absent from the `data` object below — Prisma's own schema
 * `@default(DRAFT)` applies, so every new post starts as a draft
 * regardless of `input.status` (a public-facing concept, see
 * schema.prisma's comment) — `publishPost()` is the only path that ever
 * moves it to PUBLISHED.
 *
 * A cover is generated and attached in the SAME insert (`coverAssetId` set
 * directly on `prisma.post.create`, not a second `update` afterwards) — see
 * `backend/src/media/README.md`: no post is ever observably created
 * without one, so no reader of `Post` ever has to branch on "does this post
 * have a cover yet." Cover generation happening before the row exists is
 * safe: `generateCoverForPost` never reads or writes anything keyed by the
 * post's row id, only its slug/title/category/excerpt, all of which are
 * already known here.
 */
export async function createPost(input: PostInput): Promise<PostSummary> {
    const slug = input.slug ?? (await generateUniqueSlug(input.title, isSlugTaken));
    await assertSlugAvailable(slug);

    const bodyDocumentId = await replaceDocumentContent(null, input.blocks);
    const cover = await generateCoverForPost({
        slug,
        titleEn: input.title,
        excerptEn: input.excerpt,
        categoryEn: input.category,
    });
    const row = await prisma.post.create({
        data: {
            slug,
            date: new Date().toISOString().slice(0, 10),
            title: { en: input.title, ru: "" },
            category: { en: input.category, ru: "" },
            readMins: estimateReadMins(input.blocks),
            excerpt: { en: input.excerpt, ru: "" },
            status: input.status,
            relatedWorkSlug: input.relatedWorkSlug ?? null,
            bodyDocumentId,
            coverAssetId: cover.id,
        },
        include: { cover: true },
    });
    // `assertSlugAvailable` only looked at live posts, so this slug may
    // still be some OTHER post's former address — claimed only NOW, after
    // creation has actually succeeded (found in review: claiming it
    // upfront meant a failed `replaceDocumentContent`/`post.create` below
    // would have already destroyed a redirect that no new post ended up
    // owning, with no way to get it back).
    await claimSlug("post", slug);

    return toPostSummary(row);
}

async function isSlugTaken(slug: string): Promise<boolean> {
    return (await prisma.post.findUnique({ where: { slug }, select: { slug: true } })) !== null;
}

/**
 * The autosave write path for every save AFTER a post already exists —
 * NEVER touches the live `Post` row, its `Document`, or `SlugHistory`;
 * only upserts a `ContentDraft`. `null` when `slug` (the post being
 * edited — always the LIVE slug, never the pending draft one, see
 * `AdminPostDetail.draftSlug`'s comment) doesn't exist.
 *
 * This is the fix for the bug that motivated the whole draft/publish
 * split (see content/README.md's dated entry): editing an ALREADY
 * PUBLISHED post used to autosave straight into the live row every few
 * minutes, so deleting a paragraph mid-rewrite could ship that half-
 * finished state to real readers before the admin ever confirmed
 * anything. Now nothing reaches the live row until an explicit
 * Publish/Update click (`publishPost`).
 *
 * `Post.coverAssetId` is deliberately covered by this SAME rule, not
 * exempted from it — an earlier version of this function DID update the
 * live cover eagerly here (see media/README.md's dated entry for the bug
 * that motivated wanting that), and that was a real regression of the
 * exact bug this whole function exists to prevent: editing an
 * ALREADY-PUBLISHED post's category would have changed what real readers
 * see (the live cover) the moment autosave fired, before Publish/Update
 * was ever clicked — and "Discard changes" had no way to undo it, since
 * discarding only deletes the `ContentDraft` row, never touches
 * `Post.coverAssetId`. `applyPostDraftToRow` (called only from
 * `publishPost`) is the one place a category change is allowed to reach
 * the live cover, for the same reason it's the one place any other
 * content change is allowed to.
 */
export async function savePostDraft(slug: string, input: PostInput): Promise<PostSummary | null> {
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    const base = (await readPostDraft(existing.id)) ?? (await materializeDraft(existing));
    const next = mergePostDraftInput(base, input);
    await saveDraft(KIND, existing.id, next);

    return toEffectiveSummary(existing, next);
}

/**
 * Writes `data` (the effective draft content) onto the LIVE row —
 * called ONLY by `publishPost`, which is the sole reason this isn't
 * exported. Mirrors the pre-draft-split `updatePost`'s write shape
 * exactly (same field-by-field `data` object, same
 * preserve-the-other-language-if-no-translation-pending logic), just
 * fed from a draft instead of a request body, and with `lifecycleState`/
 * `publishedAt` folded into the SAME update rather than a second
 * round-trip.
 */
async function applyPostDraftToRow(
    existing: PostRow,
    data: PostDraftData,
    lifecycle: { lifecycleState: LifecycleState; publishedAt: Date | null; contentUpdatedAt: Date | null },
): Promise<{ row: PostRow; previousSlug: string | null }> {
    const newSlug = data.slug ?? existing.slug;
    await assertSlugAvailable(newSlug, existing.slug);

    const bodyDocumentId = await replaceDocumentContent(existing.bodyDocumentId, data.blocks);
    // The ONE place a category change is allowed to reach the live cover
    // — same rule as every other field this function writes: nothing
    // reaches `Post` until Publish/Update, INCLUDING the cover (see
    // `savePostDraft`'s own comment for the real bug that existed before
    // this rule applied to `coverAssetId` too). A no-op read-then-compare
    // when the category didn't actually change — see
    // `ensureCoverMatchesCategory`'s own comment for why that's cheap.
    const coverAssetId = await ensureCoverMatchesCategory(existing.coverAssetId, {
        slug: newSlug,
        titleEn: data.title,
        excerptEn: data.excerpt,
        categoryEn: data.category,
    });

    const existingTitle = localizedTextSchema.parse(existing.title);
    const existingCategory = localizedTextSchema.parse(existing.category);
    const existingExcerpt = localizedTextSchema.parse(existing.excerpt);

    // No pending translation edit ⇒ keep whatever Russian content is
    // already live untouched — a draft's English-only edit must never
    // silently wipe out someone's translation work.
    let bodyDocumentIdRu = existing.bodyDocumentIdRu;
    let titleRu = existingTitle.ru;
    let categoryRu = existingCategory.ru;
    let excerptRu = existingExcerpt.ru;
    if (data.translation) {
        titleRu = data.translation.title;
        categoryRu = data.translation.category;
        excerptRu = data.translation.excerpt;
        bodyDocumentIdRu = await replaceDocumentContent(existing.bodyDocumentIdRu, data.translation.blocks);
    }

    const row = await prisma.post.update({
        where: { slug: existing.slug },
        data: {
            slug: newSlug,
            title: { en: data.title, ru: titleRu },
            category: { en: data.category, ru: categoryRu },
            readMins: estimateReadMins(data.blocks),
            excerpt: { en: data.excerpt, ru: excerptRu },
            status: data.status,
            relatedWorkSlug: data.relatedWorkSlug ?? null,
            bodyDocumentId,
            bodyDocumentIdRu,
            coverAssetId,
            // Explicit, not `@updatedAt` — this (and `unpublishPost`'s deliberate
            // omission of it) is what keeps this column meaning "the content
            // changed," not "the row was touched." See `Post.contentUpdatedAt`
            // in schema.prisma. The CALLER (`publishPost`) decides whether this
            // apply actually changed anything — see its own comment: a first
            // publish with no draft (nothing edited since `createPost`) must
            // leave this exactly as it was, same as it always has.
            contentUpdatedAt: lifecycle.contentUpdatedAt,
            lifecycleState: lifecycle.lifecycleState,
            publishedAt: lifecycle.publishedAt,
        },
    });

    if (newSlug !== existing.slug) {
        // Same reasoning as `createPost`'s `claimSlug` call — `assertSlugAvailable`
        // above only ruled out a collision with a LIVE post; `newSlug` can
        // still be some OTHER post's former address. Claimed only now that
        // the rename itself has actually committed.
        await claimSlug("post", newSlug);
    }

    // BEFORE announcing, so the old address already redirects by the time
    // a search engine acts on the notification. Announcing first would
    // send a crawler to a URL that still 404s, which is exactly the
    // signal-losing outcome the history table exists to prevent.
    await recordSlugChange("post", existing.slug, newSlug);

    return { row, previousSlug: newSlug === existing.slug ? null : existing.slug };
}

/**
 * `DRAFT → PUBLISHED`, or (idempotently, per `nextState()`) "apply the
 * current draft to an already-PUBLISHED post" — i.e. what the editor's
 * single Publish/Update button does either way (see
 * `web/src/views/admin-post-editor/README.md`). Takes no request body —
 * publish is an action on content that's already saved (as a draft), not
 * a place to sneak in unreviewed changes. Validates the EFFECTIVE content
 * (the pending draft, or the live row's own content if there is no
 * draft) against `postPublishSchema`, throwing a plain `ZodError` listing
 * exactly which fields are missing — nothing is written if this fails.
 * `null` when `slug` doesn't exist.
 *
 * Genuinely a no-op — no write, no snapshot, no announcement — when the
 * post is ALREADY published and there is no pending draft: clicking
 * "Update" with nothing changed must not rewrite `Document` rows, bump
 * `contentUpdatedAt` (lying about a real edit that never happened), or
 * ping IndexNow for no reason. The initial `DRAFT → PUBLISHED` transition
 * is never skipped this way even with no draft — that write (setting
 * `lifecycleState`/`publishedAt`) IS the real state change being asked for.
 *
 * Snapshots the CURRENT live content into `ContentRevision` first, but
 * ONLY when the post was already PUBLISHED before this call — a post
 * being published for the first time has nothing live yet worth
 * preserving (see `content-draft.ts`'s `snapshotRevision`).
 */
export async function publishPost(slug: string): Promise<PostSummary | null> {
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    const draft = await readPostDraft(existing.id);
    const wasAlreadyPublished = existing.lifecycleState === "PUBLISHED";
    if (wasAlreadyPublished && !draft) {
        return toPostSummary(existing);
    }

    const data = draft ?? (await materializeDraft(existing));

    postPublishSchema.parse({
        slug: data.slug ?? existing.slug,
        title: data.title,
        category: data.category,
        excerpt: data.excerpt,
        status: data.status,
        relatedWorkSlug: data.relatedWorkSlug ?? null,
        blocks: data.blocks,
    });

    if (wasAlreadyPublished) {
        await snapshotRevision(KIND, existing.id, await materializeDraft(existing), existing.publishedAt ?? existing.createdAt);
    }

    const { row, previousSlug } = await applyPostDraftToRow(existing, data, {
        lifecycleState: nextState(existing.lifecycleState, "PUBLISH"),
        publishedAt: wasAlreadyPublished ? existing.publishedAt : new Date(),
        // Only a REAL pending draft counts as "the content changed" — a
        // first publish with nothing ever drafted (a post published right
        // after `createPost`, with no edit in between) re-applies content
        // that's byte-for-byte identical to what's already on the row, so
        // this must stay whatever it already was (`null`, for a post that
        // was never edited at all), not get stamped with "now" for a change
        // that never actually happened.
        contentUpdatedAt: draft ? new Date() : existing.contentUpdatedAt,
    });
    await discardDraft(KIND, existing.id);

    const summary = toPostSummary(row);
    announcePostChange(summary, { wasPublic: wasAlreadyPublished, isPublic: true, previousSlug });
    return summary;
}

/** `PUBLISHED → DRAFT` — the deliberate, admin-initiated counterpart to `publishPost`. Never touches the pending draft (if any) — unpublishing hides the live content, it isn't an editing action. `null` when `slug` doesn't exist; throws `InvalidLifecycleTransitionError` (via `nextState`) if the post is already a draft — see `lifecycle.ts`'s comment on why UNPUBLISH isn't idempotent the way PUBLISH is. */
export async function unpublishPost(slug: string): Promise<PostSummary | null> {
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    const row = await prisma.post.update({
        where: { slug },
        data: { lifecycleState: nextState(existing.lifecycleState, "UNPUBLISH") },
    });

    const summary = toPostSummary(row);
    announcePostChange(summary, { wasPublic: true, isPublic: false, previousSlug: null });
    return summary;
}

/** `null` when `slug` doesn't exist — what `/admin/journal/[slug]/translate` loads before rendering. The English reference column shows the DRAFT's English (what will actually publish next), not necessarily the currently-live English — a translator working alongside an in-progress English rewrite should see what they're really translating against. */
export async function getPostTranslationForAdmin(slug: string): Promise<AdminPostTranslation | null> {
    const row = await prisma.post.findUnique({ where: { slug } });
    if (!row) {
        return null;
    }

    const data = (await readPostDraft(row.id)) ?? (await materializeDraft(row));
    const translation = data.translation;

    return {
        slug: row.slug,
        title: { en: data.title, ru: translation?.title ?? "" },
        category: { en: data.category, ru: translation?.category ?? "" },
        excerpt: { en: data.excerpt, ru: translation?.excerpt ?? "" },
        blocks: toDisplayBlocks(translation?.blocks ?? []),
    };
}

/**
 * Writes the pending Russian translation into the post's `ContentDraft`
 * — NEVER the live row (see this file's dated entry in content/README.md):
 * clicking "Save translation" used to make it live INSTANTLY, the exact
 * same bug class as autosave overwriting an English rewrite. `null` when
 * `slug` doesn't exist. Silent — no address became public or stopped
 * being public, so there's nothing for `announcePostChange` to say; the
 * translation only actually reaches readers once Publish/Update is
 * clicked (`applyPostDraftToRow`).
 */
export async function translatePost(slug: string, input: TranslatePostInput): Promise<PostSummary | null> {
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    const base = (await readPostDraft(existing.id)) ?? (await materializeDraft(existing));
    const next: PostDraftData = { ...base, translation: input };
    await saveDraft(KIND, existing.id, next);

    return toEffectiveSummary(existing, next);
}

/** Every past PUBLISHED version of this post, newest first — `null` when `slug` doesn't exist. What `/admin/journal/[slug]/history` lists. */
export async function listPostRevisions(slug: string): Promise<RevisionSummary[] | null> {
    const existing = await prisma.post.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) {
        return null;
    }
    return listRevisions(KIND, existing.id);
}

/**
 * "Load into draft" — copies a past revision's content into the post's
 * CURRENT draft, discarding whatever was pending, and returns the
 * refreshed `AdminPostDetail` so the editor can re-render with it.
 * Deliberately does NOT publish anything itself — a restored revision
 * still goes through the normal Publish/Update button like any other
 * edit. `null` when `slug` doesn't exist OR `revisionId` doesn't belong
 * to this post.
 */
export async function restorePostRevision(slug: string, revisionId: string): Promise<AdminPostDetail | null> {
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }
    const restored = await restoreRevisionToDraft(KIND, existing.id, revisionId);
    if (restored === null) {
        return null;
    }
    return getPostForAdmin(slug);
}

/**
 * Discards whatever draft is pending for this post, reverting the
 * editor's view back to the live, currently-published content — the
 * explicit "Discard changes" action. Returns the refreshed
 * `AdminPostDetail` (now built from `materializeDraft`, since there's no
 * `ContentDraft` row left) so the editor can re-render with it. `null`
 * when `slug` doesn't exist. A no-op, not an error, if there was no draft
 * to discard.
 */
export async function discardPostDraft(slug: string): Promise<AdminPostDetail | null> {
    const existing = await prisma.post.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) {
        return null;
    }
    await discardDraft(KIND, existing.id);
    return getPostForAdmin(slug);
}

/** `false` when `slug` doesn't exist — the API route turns that into a 404. */
export async function deletePost(slug: string): Promise<boolean> {
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing) {
        return false;
    }

    // Post row first, then its Document(s) — deleting a Document first
    // would leave `Post.bodyDocumentId`/`bodyDocumentIdRu` pointing at a
    // row that no longer exists for however briefly the statements are
    // apart.
    await prisma.post.delete({ where: { slug } });
    if (existing.bodyDocumentId) {
        await prisma.document.delete({ where: { id: existing.bodyDocumentId } }); // cascades to Block rows
    }
    if (existing.bodyDocumentIdRu) {
        await prisma.document.delete({ where: { id: existing.bodyDocumentIdRu } });
    }

    // A redirect pointing at a slug that no longer exists is worse than
    // the old address 404ing directly — the crawler pays for a hop and
    // lands on the same nothing.
    await forgetSlugHistory("post", slug);
    // No foreign key ties a `ContentDraft`/`ContentRevision` row to this
    // `Post` either — same reasoning, same cleanup obligation as
    // `forgetSlugHistory` above.
    await discardAllDraftHistory(KIND, existing.id);

    // Built from `existing`, read before the delete — the row it describes
    // is gone by now, but that's exactly the fact being announced.
    announcePostChange(toPostSummary(existing), {
        wasPublic: existing.lifecycleState === "PUBLISHED",
        isPublic: false,
        previousSlug: null,
    });
    return true;
}
