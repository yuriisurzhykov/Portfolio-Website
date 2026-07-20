import { prisma } from "../db/client";
import type { Block } from "./blocks";
import { getDocumentBlocks } from "./document";
import { localizedTextSchema, type LocalizedText } from "./localized-text";
import type { ContentLocale } from "./locale";

export type PostStatus = "published" | "upcoming";

export interface PostSummary {
    slug: string;
    /** Set once, automatically, when the post is created (`createPost`) — never editable through the admin UI. See content/README.md's dated entry on why `dateLabel` (a free-text override) was removed rather than kept alongside this. */
    date: string;
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

/** Exported for reuse by admin-posts.ts (Phase 4) — the admin CRUD layer maps the exact same Prisma row shape back to the same public `PostSummary`, so this mapping stays defined in one place. */
export function toPostSummary(row: {
    slug: string;
    date: string;
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

/**
 * Every distinct English `category` already in use, alphabetically —
 * what the admin post editor renders as clickable chips (see
 * `PostEditorPage`'s `CategoryPicker`) so writing a new post means
 * picking from what already exists instead of guessing whether "Process"
 * or "process" or "Workflow" is the category five other posts already
 * used. A plain `findMany` + dedupe in JS, not a SQL-level `DISTINCT`:
 * `category` is a `Json` column (`{en, ru}`), and distinct-on-a-JSON-path
 * needs a raw query for what a personal blog's post count (tens, not
 * millions of rows) doesn't come close to needing.
 */
export async function getDistinctPostCategories(): Promise<string[]> {
    const rows = await prisma.post.findMany({ select: { category: true } });
    const categories = new Set<string>();
    for (const row of rows) {
        const category = localizedTextSchema.parse(row.category).en.trim();
        if (category) {
            categories.add(category);
        }
    }
    return [...categories].sort((a, b) => a.localeCompare(b));
}

/** The single most recent PUBLISHED post — landing page's "From the Journal" preview never shows an upcoming stub. */
export async function getLatestPublishedPost(): Promise<PostSummary | null> {
    const row = await prisma.post.findFirst({
        where: { status: "published" },
        orderBy: { date: "desc" },
    });
    return row ? toPostSummary(row) : null;
}

/**
 * Full post, including its body blocks — null if the slug doesn't exist OR
 * the post has no body yet (upcoming stub), in EITHER language.
 *
 * `locale` picks which `Document` to read the body from — `bodyDocumentIdRu`
 * for `"ru"`, falling back to the English `bodyDocumentId` whenever no
 * translation exists yet (a post with no Russian body at all, or a
 * genuinely untranslated one). This is the silent "render on /ru/... with
 * English blocks" behavior the routing plan calls for — there's no
 * separate "not translated" state surfaced to the caller, the English
 * `Document` is simply what a Russian reader sees until a translation is
 * added (see admin-posts.ts's `translatePost`).
 */
export async function getPostBySlug(slug: string, locale: ContentLocale = "en"): Promise<PostDetail | null> {
    const row = await prisma.post.findUnique({ where: { slug } });
    if (!row) {
        return null;
    }

    const bodyDocumentId = (locale === "ru" ? row.bodyDocumentIdRu : null) ?? row.bodyDocumentId;
    if (!bodyDocumentId) {
        return null;
    }

    const body = await getDocumentBlocks(bodyDocumentId);
    return { ...toPostSummary(row), body };
}
