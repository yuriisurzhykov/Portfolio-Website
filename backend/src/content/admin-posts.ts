import { z } from "zod";
import { prisma } from "../db/client";
import { SlugAlreadyExistsError } from "../errors";
import { blockInputSchema, localizedTextSchema, type Block } from "./blocks";
import { getDocumentBlocks, replaceDocumentContent } from "./document";
import { slugSchema } from "./slug";
import { toPostSummary, type PostStatus, type PostSummary } from "./posts";

export const postInputSchema = z.object({
    slug: slugSchema,
    date: z.string().min(1),
    dateLabel: z.string().nullish(),
    title: localizedTextSchema,
    category: localizedTextSchema,
    readMins: z.number().int().min(0),
    excerpt: localizedTextSchema,
    status: z.enum(["published", "upcoming"] satisfies PostStatus[]),
    relatedWorkSlug: z.string().nullish(),
    // Whole-document replace, not incremental block edits — see
    // document.ts's `replaceDocumentContent` for why.
    blocks: z.array(blockInputSchema),
});
export type PostInput = z.infer<typeof postInputSchema>;

export interface AdminPostDetail extends PostSummary {
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

export async function createPost(input: PostInput): Promise<PostSummary> {
    await assertSlugAvailable(input.slug);

    const bodyDocumentId = await replaceDocumentContent(null, input.blocks);
    const row = await prisma.post.create({
        data: {
            slug: input.slug,
            date: input.date,
            dateLabel: input.dateLabel ?? null,
            title: input.title,
            category: input.category,
            readMins: input.readMins,
            excerpt: input.excerpt,
            status: input.status,
            relatedWorkSlug: input.relatedWorkSlug ?? null,
            bodyDocumentId,
        },
    });

    return toPostSummary(row);
}

/** `null` when `slug` (the post being edited) doesn't exist. */
export async function updatePost(slug: string, input: PostInput): Promise<PostSummary | null> {
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing) {
        return null;
    }

    await assertSlugAvailable(input.slug, slug);

    const bodyDocumentId = await replaceDocumentContent(existing.bodyDocumentId, input.blocks);
    const row = await prisma.post.update({
        where: { slug },
        data: {
            slug: input.slug,
            date: input.date,
            dateLabel: input.dateLabel ?? null,
            title: input.title,
            category: input.category,
            readMins: input.readMins,
            excerpt: input.excerpt,
            status: input.status,
            relatedWorkSlug: input.relatedWorkSlug ?? null,
            bodyDocumentId,
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

    // Post row first, then its Document — deleting the Document first would
    // leave `Post.bodyDocumentId` pointing at a row that no longer exists
    // for however briefly the two statements are apart.
    await prisma.post.delete({ where: { slug } });
    if (existing.bodyDocumentId) {
        await prisma.document.delete({ where: { id: existing.bodyDocumentId } }); // cascades to Block rows
    }

    return true;
}
