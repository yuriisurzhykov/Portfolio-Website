import { z } from "zod";
import { prisma } from "../db/client";
import { SlugAlreadyExistsError } from "../errors";
import { blockInputSchema, type Block } from "./blocks";
import { getDocumentBlocks, replaceDocumentContent } from "./document";
import { localizedTextSchema, type LocalizedText } from "./localized-text";
import { slugSchema } from "./slug";
import { toPostSummary, type PostStatus, type PostSummary } from "./posts";

/**
 * English-only now — see the migration plan's "перевод — отдельная
 * страница, не параллельный ввод". Creating/editing a post through this
 * schema only ever touches the English side of `title`/`category`/
 * `excerpt` (via `localizedTextSchema`'s `ru: ""` default, set explicitly
 * below in `createPost`) and the English body (`bodyDocumentId`) — the
 * Russian side is exclusively `translatePostInputSchema`/`translatePost`'s
 * job, below.
 *
 * No `date`/`dateLabel` here at all — `date` is set once, automatically,
 * by `createPost` (never by the admin), and `dateLabel` (a free-text
 * override for imprecise/upcoming dates) has been removed outright, not
 * just hidden from this schema — see content/README.md's dated entry.
 */
export const postInputSchema = z.object({
    slug: slugSchema,
    title: z.string().min(1),
    category: z.string().min(1),
    readMins: z.number().int().min(0),
    excerpt: z.string().min(1),
    status: z.enum(["published", "upcoming"] satisfies PostStatus[]),
    relatedWorkSlug: z.string().nullish(),
    // Whole-document replace, not incremental block edits — see
    // document.ts's `replaceDocumentContent` for why.
    blocks: z.array(blockInputSchema),
});
export type PostInput = z.infer<typeof postInputSchema>;

/**
 * The "Add translation"/"Edit translation" screen's write contract
 * (`/admin/journal/[slug]/translate` → `PUT /api/admin/posts/[slug]/translation`)
 * — deliberately only the fields that have a language-specific value at
 * all. `slug`/`date`/`readMins`/`status`/`relatedWorkSlug` aren't
 * translated, they're the same record either way, so they simply don't
 * appear here — there is no way to accidentally overwrite them from this
 * screen, not just a documented one.
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
 * Unlike the public `getPostBySlug` (posts.ts), never returns `null` just
 * because there's no body document yet — an "upcoming" stub with nothing
 * written is still a perfectly valid thing for the admin editor to open
 * and add content to. Only `null` when the post itself doesn't exist.
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
 */
export async function createPost(input: PostInput): Promise<PostSummary> {
    await assertSlugAvailable(input.slug);

    const bodyDocumentId = await replaceDocumentContent(null, input.blocks);
    const row = await prisma.post.create({
        data: {
            slug: input.slug,
            date: new Date().toISOString().slice(0, 10),
            title: { en: input.title, ru: "" },
            category: { en: input.category, ru: "" },
            readMins: input.readMins,
            excerpt: { en: input.excerpt, ru: "" },
            status: input.status,
            relatedWorkSlug: input.relatedWorkSlug ?? null,
            bodyDocumentId,
        },
    });

    return toPostSummary(row);
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
 * again, editing included.
 */
export async function updatePost(slug: string, input: PostInput): Promise<PostSummary | null> {
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    await assertSlugAvailable(input.slug, slug);

    const existingTitle = localizedTextSchema.parse(existing.title);
    const existingCategory = localizedTextSchema.parse(existing.category);
    const existingExcerpt = localizedTextSchema.parse(existing.excerpt);

    const bodyDocumentId = await replaceDocumentContent(existing.bodyDocumentId, input.blocks);
    const row = await prisma.post.update({
        where: { slug },
        data: {
            slug: input.slug,
            title: { ...existingTitle, en: input.title },
            category: { ...existingCategory, en: input.category },
            readMins: input.readMins,
            excerpt: { ...existingExcerpt, en: input.excerpt },
            status: input.status,
            relatedWorkSlug: input.relatedWorkSlug ?? null,
            bodyDocumentId,
        },
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
