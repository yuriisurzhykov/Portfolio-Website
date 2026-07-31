import { z } from "zod";
import { prisma } from "../db/client";
import { SlugAlreadyExistsError } from "../errors";
import { blockInputSchema, type Block } from "./blocks";
import { getDocumentBlocks, replaceDocumentContent } from "./document";
import type { LifecycleState } from "./lifecycle";
import { nextState } from "./lifecycle";
import { localizedTextSchema, type LocalizedText } from "./localized-text";
import { estimateReadMins } from "./reading-time";
import { generateUniqueSlug, slugSchema } from "./slug";
import { toPostSummary, type PostStatus, type PostSummary } from "./posts";

/**
 * The STRICT contract — what a Post must satisfy to be shown on the public
 * site. Used in exactly two places: `publishPost()` (validates the record
 * that's ALREADY in the database, not a request body — publish takes no
 * body at all, see its own comment) and, as a `.safeParse()` readiness
 * check (not a throw), `updatePost()`'s auto-unpublish safety net below.
 * Named `postPublishSchema`, not `postInputSchema` — this file used to
 * have exactly one schema by that name and use it for create/update too;
 * see `postDraftInputSchema` below for why create/update moved off of it
 * (2026-07-31, content lifecycle state machine).
 *
 * No `date`/`dateLabel`/`readMins` here at all — `date` is set once,
 * automatically, by `createPost` (never by the admin); `dateLabel` (a
 * free-text override for imprecise/upcoming dates) has been removed
 * outright; `readMins` is recomputed from `blocks` on every save (see
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
 * — see `generateUniqueSlug`, `slug.ts`). This is now what `createPost`/
 * `updatePost` actually accept, ALWAYS, not just while a record is a
 * draft: a post mid-write is real, storable content the moment a human
 * starts typing a title, even before it has a category or a single block
 * — the strict shape above is a PUBLISH-time gate, not a save-time one.
 * `PostInput` (the type every caller outside this file imports) is this
 * schema's output type, not the strict one.
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
 * derived from the ENGLISH body only — see `createPost`/`updatePost` —
 * a Russian translation being longer or shorter never changes it.)
 */
export const translatePostInputSchema = z.object({
    title: z.string(),
    category: z.string(),
    excerpt: z.string(),
    blocks: z.array(blockInputSchema),
});
export type TranslatePostInput = z.infer<typeof translatePostInputSchema>;

export interface AdminPostDetail extends PostSummary {
    blocks: Block[];
}

/** What `/admin/journal/[slug]/translate` reads before rendering its form — full `{en, ru}` pairs (not just `ru`) so the page can show the English original next to the field the translator is filling in. */
export interface AdminPostTranslation {
    slug: string;
    title: LocalizedText;
    category: LocalizedText;
    excerpt: LocalizedText;
    /** The Russian body's blocks — `[]` (not a fallback to the English body) when no translation exists yet; the translate page's editor should start empty, not silently pre-filled with English text as if it were already translated. */
    blocks: Block[];
}

/**
 * Every post, BOTH lifecycle states, newest first — what
 * `/admin/journal`'s list page renders (Draft/Published tabs filter this
 * client-side, see `AdminJournalListPage`), unlike the public
 * `getJournalEntries()` (posts.ts), which only ever returns PUBLISHED
 * rows. Reuses `toPostSummary` — same mapping, same `PostSummary` shape,
 * just a different `where` clause — so admin and public views can never
 * silently drift on how a raw Prisma row becomes a summary.
 */
export async function getPostsForAdmin(): Promise<PostSummary[]> {
    const rows = await prisma.post.findMany({ orderBy: { date: "desc" } });
    return rows.map(toPostSummary);
}

/**
 * Unlike the public `getPostBySlug` (posts.ts), never returns `null` just
 * because the post is a DRAFT or has no body document yet (an "upcoming"
 * stub with nothing written is still a perfectly valid thing for the
 * admin editor to open and add content to) — only `null` when the post
 * itself doesn't exist.
 */
export async function getPostForAdmin(slug: string): Promise<AdminPostDetail | null> {
    const row = await prisma.post.findUnique({ where: { slug } });
    if (!row) {
        return null;
    }

    const blocks = row.bodyDocumentId ? await getDocumentBlocks(row.bodyDocumentId) : [];
    return { ...toPostSummary(row), blocks };
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
 * `lifecycleState` is deliberately absent from the `data` object below —
 * Prisma's own schema `@default(DRAFT)` applies, so every new post starts
 * as a draft regardless of `input.status` (a public-facing concept, see
 * schema.prisma's comment) — `publishPost()` is the only path that ever
 * moves it to PUBLISHED.
 */
export async function createPost(input: PostInput): Promise<PostSummary> {
    const slug = input.slug ?? (await generateUniqueSlug(input.title, isSlugTaken));
    await assertSlugAvailable(slug);

    const bodyDocumentId = await replaceDocumentContent(null, input.blocks);
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
        },
    });

    return toPostSummary(row);
}

async function isSlugTaken(slug: string): Promise<boolean> {
    return (await prisma.post.findUnique({ where: { slug }, select: { slug: true } })) !== null;
}

/**
 * `null` when `slug` (the post being edited) doesn't exist. English-only,
 * same as `createPost` — but here that means preserving whatever `ru` a
 * translation may already have set on `title`/`category`/`excerpt`
 * (`{...existing, en: input.title}`, not a wholesale overwrite): editing
 * the English post must never silently wipe out someone's translation
 * work. The Russian body Document (`bodyDocumentIdRu`) isn't touched at
 * all here — only `translatePost` below ever writes to it. `date` isn't
 * in `data` at all — it's set once, by `createPost`, and never changes
 * again, editing included. `readMins`, unlike `date`, IS recomputed here
 * every time — it tracks the body's current length, not a fixed point in
 * time. `input.slug` omitted (the soft contract's normal shape once a
 * post already exists — the admin form only sends a new value when
 * actually renaming) means "keep the current slug," not "regenerate one
 * from the title" — regenerating on every save would silently change a
 * possibly-already-linked-to URL.
 *
 * Auto-unpublish safety net (2026-07-31, content lifecycle state
 * machine): a soft-schema save must never be REJECTED just because the
 * post used to be published and the edit removed something the strict
 * publish contract requires (e.g. clearing `excerpt`) — a draft-shaped
 * save has to always succeed. Instead, if the post is currently
 * PUBLISHED and the new content would fail `postPublishSchema`, this
 * silently moves it back to DRAFT as part of the same update. The caller
 * (the admin editor) detects this by comparing the `lifecycleState` it
 * already had against the one this function returns — no separate
 * "wasAutoUnpublished" flag needed, the returned `PostSummary` already
 * carries the true, current state.
 */
export async function updatePost(slug: string, input: PostInput): Promise<PostSummary | null> {
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    const newSlug = input.slug ?? existing.slug;
    await assertSlugAvailable(newSlug, slug);

    const existingTitle = localizedTextSchema.parse(existing.title);
    const existingCategory = localizedTextSchema.parse(existing.category);
    const existingExcerpt = localizedTextSchema.parse(existing.excerpt);

    const bodyDocumentId = await replaceDocumentContent(existing.bodyDocumentId, input.blocks);

    const stillPublishable = postPublishSchema.safeParse({
        slug: newSlug,
        title: input.title,
        category: input.category,
        excerpt: input.excerpt,
        status: input.status,
        relatedWorkSlug: input.relatedWorkSlug ?? null,
        blocks: input.blocks,
    }).success;
    const lifecycleState: LifecycleState =
        existing.lifecycleState === "PUBLISHED" && !stillPublishable ? "DRAFT" : existing.lifecycleState;

    const row = await prisma.post.update({
        where: { slug },
        data: {
            slug: newSlug,
            title: { ...existingTitle, en: input.title },
            category: { ...existingCategory, en: input.category },
            readMins: estimateReadMins(input.blocks),
            excerpt: { ...existingExcerpt, en: input.excerpt },
            status: input.status,
            relatedWorkSlug: input.relatedWorkSlug ?? null,
            bodyDocumentId,
            lifecycleState,
        },
    });

    return toPostSummary(row);
}

/**
 * `DRAFT → PUBLISHED` — the only path that ever sets `lifecycleState` to
 * PUBLISHED. Takes no request body (the plan's own requirement: publish
 * is an action on the record that's already saved, not a place to sneak
 * in content changes) — validates whatever's ALREADY in the database
 * against `postPublishSchema`, throwing a plain `ZodError` (the same
 * error shape `createPost`/`updatePost` throw on bad input, so
 * `toErrorResponse`/`formatValidationError`, web) needs no new
 * error-handling branch) listing exactly which fields are missing.
 * `null` when `slug` doesn't exist.
 *
 * Idempotent per `nextState()` — publishing an already-PUBLISHED post
 * succeeds and leaves `publishedAt` untouched (see its own comment on
 * `Post` in schema.prisma) rather than resetting it to "now".
 */
export async function publishPost(slug: string): Promise<PostSummary | null> {
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    const blocks = existing.bodyDocumentId ? await getDocumentBlocks(existing.bodyDocumentId) : [];
    const title = localizedTextSchema.parse(existing.title);
    const category = localizedTextSchema.parse(existing.category);
    const excerpt = localizedTextSchema.parse(existing.excerpt);
    postPublishSchema.parse({
        slug: existing.slug,
        title: title.en,
        category: category.en,
        excerpt: excerpt.en,
        status: existing.status,
        relatedWorkSlug: existing.relatedWorkSlug,
        blocks,
    });

    const wasAlreadyPublished = existing.lifecycleState === "PUBLISHED";
    const row = await prisma.post.update({
        where: { slug },
        data: {
            lifecycleState: nextState(existing.lifecycleState, "PUBLISH"),
            publishedAt: wasAlreadyPublished ? existing.publishedAt : new Date(),
        },
    });
    return toPostSummary(row);
}

/**
 * `PUBLISHED → DRAFT` — the deliberate, admin-initiated counterpart to
 * `publishPost`. `null` when `slug` doesn't exist; throws
 * `InvalidLifecycleTransitionError` (via `nextState`) if the post is
 * already a draft — see `lifecycle.ts`'s comment on why UNPUBLISH isn't
 * idempotent the way PUBLISH is.
 */
export async function unpublishPost(slug: string): Promise<PostSummary | null> {
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    const row = await prisma.post.update({
        where: { slug },
        data: { lifecycleState: nextState(existing.lifecycleState, "UNPUBLISH") },
    });
    return toPostSummary(row);
}

/** `null` when `slug` doesn't exist — what `/admin/journal/[slug]/translate` loads before rendering. */
export async function getPostTranslationForAdmin(slug: string): Promise<AdminPostTranslation | null> {
    const row = await prisma.post.findUnique({ where: { slug } });
    if (!row) {
        return null;
    }

    const blocks = row.bodyDocumentIdRu ? await getDocumentBlocks(row.bodyDocumentIdRu) : [];
    return {
        slug: row.slug,
        title: localizedTextSchema.parse(row.title),
        category: localizedTextSchema.parse(row.category),
        excerpt: localizedTextSchema.parse(row.excerpt),
        blocks,
    };
}

/**
 * The ONLY function that writes a Russian value for `title`/`category`/
 * `excerpt`, or touches `bodyDocumentIdRu` — mirrors `updatePost`'s
 * preserve-the-other-language shape exactly, just with `en`/`ru` swapped.
 * `null` when `slug` doesn't exist; never creates the post itself (there's
 * no "translate" action for a post that doesn't exist in English yet —
 * that's what `createPost` is for).
 */
export async function translatePost(slug: string, input: TranslatePostInput): Promise<PostSummary | null> {
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    const existingTitle = localizedTextSchema.parse(existing.title);
    const existingCategory = localizedTextSchema.parse(existing.category);
    const existingExcerpt = localizedTextSchema.parse(existing.excerpt);

    const bodyDocumentIdRu = await replaceDocumentContent(existing.bodyDocumentIdRu, input.blocks);
    const row = await prisma.post.update({
        where: { slug },
        data: {
            title: { ...existingTitle, ru: input.title },
            category: { ...existingCategory, ru: input.category },
            excerpt: { ...existingExcerpt, ru: input.excerpt },
            bodyDocumentIdRu,
        },
    });

    return toPostSummary(row);
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

    return true;
}
