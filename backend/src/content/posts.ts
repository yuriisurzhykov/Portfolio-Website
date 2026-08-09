import { prisma } from "../db/client";
import type { Block } from "./blocks";
import { getDocumentBlocks } from "./document";
import type { LifecycleState } from "./lifecycle";
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
    /**
     * Draft/publish visibility — NOT the same axis as `status` above (see
     * schema.prisma's comment on `Post.lifecycleState`). Every function in
     * THIS file already filters to `PUBLISHED` only, so on every value
     * this type ever actually flows through here it's always
     * `"PUBLISHED"` — it's included in the shared summary type (rather
     * than a public-only narrower type) because `admin-posts.ts`'s
     * `getPostsForAdmin()` returns the exact same `PostSummary[]` shape
     * for BOTH states, and one shared type is what lets it reuse
     * `toPostSummary` at all.
     */
    lifecycleState: LifecycleState;
    /** Mirrors `Post.publishedAt` — see schema.prisma's comment for why an UNPUBLISH never clears it. */
    publishedAt: string | null;
    /**
     * When the post's CONTENT last changed — `null` for rows predating the
     * column (see schema.prisma's comment for why there's no backfill).
     * Both consumers fall back to `publishedAt`: `lastmod` in sitemap.xml
     * and `dateModified` in the post's JSON-LD. Replaces `updatedAt` on
     * this type rather than joining it — the public API surface doesn't
     * grow, and "the row was touched" was never a useful thing to publish.
     */
    contentUpdatedAt: string | null;
    /**
     * Whether `/journal/:slug` would actually render, without fetching the
     * body — mirror of `WorkSummary.hasCaseStudy`. `status === "published"`
     * does NOT imply this: an upcoming stub is filtered out by `status`,
     * but a published post whose body document was never written makes
     * `/journal/[slug]` call `notFound()`, and sitemap.xml must not list a
     * guaranteed 404.
     */
    hasBody: boolean;
    /**
     * The locales this post has its OWN version in — always contains
     * `"en"`, and `"ru"` only once a Russian body document exists. What
     * hreflang/`alternates.languages` is built from, so it has to mean
     * "there is a Russian page here", not "somebody translated the title":
     * a Russian headline over an English body is not a Russian version.
     *
     * A list, not a `hasRussianVersion` boolean, so a third language is a
     * new VALUE rather than a new field to add at every consumer.
     */
    availableLocales: ContentLocale[];
}

export interface PostDetail extends PostSummary {
    /** Never null when this type is actually returned — `getPostBySlug` returns `null` outright (not a detail with a null body) for a post with no body document yet. */
    body: Block[];
}

/**
 * Exported for reuse by admin-posts.ts (Phase 4) — the admin CRUD layer
 * maps the exact same Prisma row shape back to the same public
 * `PostSummary`, so this mapping stays defined in one place.
 *
 * `availableLocales` is derived HERE, from `bodyDocumentIdRu`, rather than
 * being passed in: which columns imply "there is a Russian version of this
 * post" is this module's business, and `Work`'s honest answer is a
 * different column with a different rule (see `toWorkSummary`) — a shared
 * rule across both types would have to lie about one of them.
 */
export function toPostSummary(row: {
    slug: string;
    date: string;
    title: unknown;
    category: unknown;
    readMins: number;
    excerpt: unknown;
    status: string;
    relatedWorkSlug: string | null;
    bodyDocumentId: string | null;
    bodyDocumentIdRu: string | null;
    lifecycleState: LifecycleState;
    publishedAt: Date | null;
    contentUpdatedAt: Date | null;
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
        lifecycleState: row.lifecycleState,
        publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
        contentUpdatedAt: row.contentUpdatedAt ? row.contentUpdatedAt.toISOString() : null,
        hasBody: row.bodyDocumentId !== null,
        availableLocales: row.bodyDocumentIdRu !== null ? ["en", "ru"] : ["en"],
    };
}

/**
 * Every PUBLISHED journal entry (published AND upcoming `status` stubs
 * alike — see `PostStatus`), newest first — the commit-log view at
 * /journal shows both, dimming the upcoming ones. Named for what it
 * actually returns, not "getPublishedPosts": an earlier draft of this
 * function was named that, then had to be renamed once it became clear
 * the /journal page needs upcoming stubs too, not just published posts —
 * see content/README.md. `where: { lifecycleState: "PUBLISHED" }` added
 * 2026-07-31 (content lifecycle state machine) — a DRAFT post/stub must
 * never appear on the public site regardless of its `status`; the
 * admin-only equivalent that returns both lifecycle states is
 * `admin-posts.ts`'s `getPostsForAdmin()`.
 */
export async function getJournalEntries(): Promise<PostSummary[]> {
    const rows = await prisma.post.findMany({ where: { lifecycleState: "PUBLISHED" }, orderBy: { date: "desc" } });
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

/**
 * The single most recent live post — landing page's "From the Journal"
 * preview never shows an upcoming (`status`) stub OR a DRAFT
 * (`lifecycleState`) post; both conditions are required, since they guard
 * two independent things (is it announced-but-unwritten vs. is it visible
 * at all).
 */
export async function getLatestPublishedPost(): Promise<PostSummary | null> {
    const row = await prisma.post.findFirst({
        where: { status: "published", lifecycleState: "PUBLISHED" },
        orderBy: { date: "desc" },
    });
    return row ? toPostSummary(row) : null;
}

/**
 * Full post, including its body blocks — null if the slug doesn't exist,
 * the post is a DRAFT (`lifecycleState`, not visible on the public site at
 * all), OR the post has no body yet (upcoming stub), in EITHER language.
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
    if (!row || row.lifecycleState !== "PUBLISHED") {
        return null;
    }

    const bodyDocumentId = (locale === "ru" ? row.bodyDocumentIdRu : null) ?? row.bodyDocumentId;
    if (!bodyDocumentId) {
        return null;
    }

    const body = await getDocumentBlocks(bodyDocumentId);
    return { ...toPostSummary(row), body };
}
