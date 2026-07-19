import { prisma } from "../db/client";
import { localizedTextSchema, type Block, type LocalizedText } from "./blocks";
import { getDocumentBlocks } from "./document";

export type PostStatus = "published" | "upcoming";

export interface PostSummary {
    slug: string;
    date: string;
    dateLabel: string | null;
    title: LocalizedText;
    category: LocalizedText;
    readMins: number;
    excerpt: LocalizedText;
    status: PostStatus;
    relatedWorkSlug: string | null;
}

export interface PostDetail extends PostSummary {
    /** Never null when this type is actually returned — `getPostBySlug` returns `null` outright (not a detail with a null body) for a post with no body document yet. */
    body: Block[];
}

function toPostSummary(row: {
    slug: string;
    date: string;
    dateLabel: string | null;
    title: unknown;
    category: unknown;
    readMins: number;
    excerpt: unknown;
    status: string;
    relatedWorkSlug: string | null;
}): PostSummary {
    return {
        slug: row.slug,
        date: row.date,
        dateLabel: row.dateLabel,
        title: localizedTextSchema.parse(row.title),
        category: localizedTextSchema.parse(row.category),
        readMins: row.readMins,
        excerpt: localizedTextSchema.parse(row.excerpt),
        status: row.status as PostStatus,
        relatedWorkSlug: row.relatedWorkSlug,
    };
}

/**
 * Every journal entry (published AND upcoming stubs), newest first — the
 * commit-log view at /journal shows both, dimming the upcoming ones. Named
 * for what it actually returns, not "getPublishedPosts": an earlier draft
 * of this function was named that, then had to be renamed once it became
 * clear the /journal page needs upcoming stubs too, not just published
 * posts — see content/README.md.
 */
export async function getJournalEntries(): Promise<PostSummary[]> {
    const rows = await prisma.post.findMany({ orderBy: { date: "desc" } });
    return rows.map(toPostSummary);
}

/** The single most recent PUBLISHED post — landing page's "From the Journal" preview never shows an upcoming stub. */
export async function getLatestPublishedPost(): Promise<PostSummary | null> {
    const row = await prisma.post.findFirst({
        where: { status: "published" },
        orderBy: { date: "desc" },
    });
    return row ? toPostSummary(row) : null;
}

/** Full post, including its body blocks — null if the slug doesn't exist OR the post has no body yet (upcoming stub). */
export async function getPostBySlug(slug: string): Promise<PostDetail | null> {
    const row = await prisma.post.findUnique({ where: { slug } });
    if (!row || !row.bodyDocumentId) {
        return null;
    }

    const body = await getDocumentBlocks(row.bodyDocumentId);
    return { ...toPostSummary(row), body };
}
