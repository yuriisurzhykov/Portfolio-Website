import { prisma } from "../db/client";
import type { Block, BlockInput } from "../content/blocks";
import type { ContentLocale } from "../content/locale";
import { localizedTextSchema, type LocalizedText } from "../content/localized-text";
import { coverUrlFor } from "../media/covers";
import { getMediaStore } from "../media/media-store";
import { collectLinkUrls, parseInternalTarget, type InternalTarget } from "./collect-urls";
import { decodeHtml, extractMetadata } from "./extract-metadata";
import { storeLinkImage } from "./link-images";
import { LinkFetchError, safeFetch, type SafeFetchOptions } from "./safe-fetch";
import { displayDomain, normalizeUrlKey } from "./url-key";

/** A snapshot this old is refreshed the next time the author saves — no cron, see the README. */
const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
/** A failed fetch is not retried on every autosave — only after this long, or on an explicit "Обновить". */
const RETRY_FAILED_AFTER_MS = 60 * 60 * 1000;
const MAX_HTML_BYTES = 512 * 1024;
const CONCURRENCY = 4;
/** Only `"en"` snapshots are written today — see `LinkPreview.locale`'s schema comment. */
const SNAPSHOT_LOCALE = "en";

export interface LinkPreviewImage {
    src: string;
    placeholder: string;
    width: number;
    height: number;
}

/**
 * Everything a badge, row or card renders — the same shape for an external
 * page and for this site's own Work/Post, so the frontend has one code path.
 * Already localized: `title`/`description` are plain strings for the
 * requested locale, not `{en, ru}`.
 */
export interface LinkPreviewView {
    /** The URL exactly as the author wrote it — what the frontend looks previews up by, and what the link points at (never `og:url`). */
    url: string;
    kind: "external" | "work" | "post";
    title: string | null;
    description: string | null;
    siteName: string | null;
    domain: string;
    image: LinkPreviewImage | null;
    faviconUrl: string | null;
    /** Identity hue (0–360) for this site's own Work/Post, `null` for external pages. */
    hue: number | null;
    status: "ok" | "failed";
    /** Admin-only diagnostics — `getLinkPreviews` leaves it `null` unless `includeErrors` is asked for. */
    lastError: string | null;
}

export type LinkPreviewMap = Record<string, LinkPreviewView>;

/** Test seam for `safeFetch`'s network rules — same idea as `setMediaStoreForTesting`. */
let fetchOptionsOverride: Partial<SafeFetchOptions> = {};

export function setLinkFetchOptionsForTesting(options: Partial<SafeFetchOptions> | undefined): void {
    fetchOptionsOverride = options ?? {};
}

function pick(text: LocalizedText, locale: ContentLocale): string {
    return locale === "ru" && text.ru.trim() !== "" ? text.ru : text.en;
}

function parseLocalized(value: unknown): LocalizedText | null {
    const parsed = localizedTextSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
}

async function runPool<T>(items: readonly T[], worker: (item: T) => Promise<void>): Promise<void> {
    const queue = [...items];
    const runners = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
        for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
            await worker(item);
        }
    });
    await Promise.all(runners);
}

function needsRefresh(existing: { status: string; fetchedAt: Date } | null, force: boolean, now: number): boolean {
    if (force || !existing) {
        return true;
    }
    const age = now - existing.fetchedAt.getTime();
    return existing.status === "ok" ? age > STALE_AFTER_MS : age > RETRY_FAILED_AFTER_MS;
}

async function fetchSnapshot(url: string): Promise<{
    finalUrl: string;
    title: string | null;
    description: string | null;
    siteName: string | null;
    imageAssetId: string | null;
    faviconAssetId: string | null;
}> {
    const page = await safeFetch(url, {
        ...fetchOptionsOverride,
        maxBytes: MAX_HTML_BYTES,
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
        acceptLanguage: SNAPSHOT_LOCALE,
        stopAtHeadEnd: true,
    });
    if (page.status >= 400) {
        throw new LinkFetchError(`The site answered with HTTP ${ page.status }.`);
    }
    if (!/html/i.test(page.contentType ?? "")) {
        throw new LinkFetchError("The link is not an HTML page.");
    }

    const metadata = extractMetadata(decodeHtml(page.body, page.contentType), page.finalUrl);
    const [imageAssetId, faviconAssetId] = await Promise.all([
        metadata.imageUrl ? storeLinkImage(metadata.imageUrl, "link-image", fetchOptionsOverride) : null,
        metadata.faviconUrl ? storeLinkImage(metadata.faviconUrl, "link-favicon", fetchOptionsOverride) : null,
    ]);

    return {
        finalUrl: page.finalUrl,
        title: metadata.title,
        description: metadata.description,
        siteName: metadata.siteName,
        imageAssetId,
        faviconAssetId,
    };
}

async function refreshOne(url: string, urlKey: string): Promise<void> {
    const where = { urlKey_locale: { urlKey, locale: SNAPSHOT_LOCALE } };
    try {
        const snapshot = await fetchSnapshot(url);
        const data = { ...snapshot, status: "ok", lastError: null, fetchedAt: new Date() };
        await prisma.linkPreview.upsert({ where, create: { urlKey, locale: SNAPSHOT_LOCALE, ...data }, update: data });
    } catch (error) {
        const lastError = error instanceof LinkFetchError ? error.reason : "The preview could not be built.";
        // An earlier good snapshot keeps its title/image — only the status
        // and the error change, so a site that is down for a day doesn't
        // turn a published card back into a bare link.
        await prisma.linkPreview.upsert({
            where,
            create: { urlKey, locale: SNAPSHOT_LOCALE, finalUrl: url, status: "failed", lastError, fetchedAt: new Date() },
            update: { status: "failed", lastError, fetchedAt: new Date() },
        });
    }
}

/**
 * Fetches (or re-fetches) the snapshot for every external URL in `urls`
 * that has none yet, is older than 30 days, or — with `force` — always.
 * Own-site links and anything that isn't absolute http(s) are skipped:
 * those never have a snapshot. Never throws for a single bad URL; each
 * failure is recorded on its own row. At most 4 sites are fetched at once.
 *
 * Called ONLY from admin-authenticated code paths (the editor's preview
 * route, draft saves) — never from a public page render.
 */
export async function refreshLinkPreviews(urls: readonly string[], options: { force?: boolean } = {}): Promise<void> {
    const byKey = new Map<string, string>();
    for (const url of urls) {
        const urlKey = normalizeUrlKey(url);
        if (urlKey && !parseInternalTarget(url) && !byKey.has(urlKey)) {
            byKey.set(urlKey, url);
        }
    }
    if (byKey.size === 0) {
        return;
    }

    const existing = await prisma.linkPreview.findMany({
        where: { urlKey: { in: [...byKey.keys()] }, locale: SNAPSHOT_LOCALE },
        select: { urlKey: true, status: true, fetchedAt: true },
    });
    const existingByKey = new Map(existing.map((row) => [row.urlKey, row]));
    const now = Date.now();
    const due = [...byKey].filter(([urlKey]) => needsRefresh(existingByKey.get(urlKey) ?? null, options.force ?? false, now));

    await runPool(due, ([urlKey, url]) => refreshOne(url, urlKey));
}

/** `refreshLinkPreviews` for every link a document uses — what the admin save routes call. */
export async function refreshLinkPreviewsForBlocks(blocks: readonly (Block | BlockInput)[]): Promise<void> {
    await refreshLinkPreviews(collectLinkUrls(blocks));
}

async function externalViews(urls: readonly string[], includeErrors: boolean): Promise<LinkPreviewView[]> {
    const keyByUrl = new Map<string, string>();
    for (const url of urls) {
        const urlKey = normalizeUrlKey(url);
        if (urlKey) {
            keyByUrl.set(url, urlKey);
        }
    }
    if (keyByUrl.size === 0) {
        return [];
    }

    const rows = await prisma.linkPreview.findMany({
        where: { urlKey: { in: [...new Set(keyByUrl.values())] }, locale: SNAPSHOT_LOCALE },
        include: { image: true, favicon: true },
    });
    const rowByKey = new Map(rows.map((row) => [row.urlKey, row]));
    const store = getMediaStore();

    const views: LinkPreviewView[] = [];
    for (const [url, urlKey] of keyByUrl) {
        const row = rowByKey.get(urlKey);
        // A row that never produced a title (first fetch failed) is nothing a
        // reader can use — the page falls back to a plain link. The admin
        // still gets it, to show WHY there is no preview.
        if (!row || (row.title === null && !includeErrors)) {
            continue;
        }
        views.push({
            url,
            kind: "external",
            title: row.title,
            description: row.description,
            siteName: row.siteName,
            domain: displayDomain(row.finalUrl),
            image: row.image
                ? { src: store.url(row.image.storageKey), placeholder: row.image.placeholder, width: row.image.width, height: row.image.height }
                : null,
            faviconUrl: row.favicon ? store.url(row.favicon.storageKey) : null,
            hue: null,
            status: row.status === "ok" ? "ok" : "failed",
            lastError: includeErrors ? row.lastError : null,
        });
    }
    return views;
}

async function hueFor(kind: string, key: string | null | undefined): Promise<number | null> {
    if (!key) {
        return null;
    }
    const row = await prisma.identityHue.findUnique({ where: { kind_key: { kind, key } }, select: { hue: true } });
    return row?.hue ?? null;
}

/**
 * Own-site links read straight from `Work`/`Post` — always current, no
 * snapshot. Only PUBLISHED items: a link to a draft stays a plain link
 * rather than leaking the draft's title. The hue is only READ here (never
 * assigned): a public render must not write to the database.
 */
async function internalViews(targets: readonly [string, InternalTarget][], locale: ContentLocale): Promise<LinkPreviewView[]> {
    const workSlugs = targets.filter(([, target]) => target.kind === "work").map(([, target]) => target.slug);
    const postSlugs = targets.filter(([, target]) => target.kind === "post").map(([, target]) => target.slug);

    const [works, posts] = await Promise.all([
        workSlugs.length ? prisma.work.findMany({ where: { slug: { in: workSlugs }, lifecycleState: "PUBLISHED" }, include: { cover: true } }) : [],
        postSlugs.length ? prisma.post.findMany({ where: { slug: { in: postSlugs }, lifecycleState: "PUBLISHED" }, include: { cover: true } }) : [],
    ]);
    const workBySlug = new Map(works.map((work) => [work.slug, work]));
    const postBySlug = new Map(posts.map((post) => [post.slug, post]));

    const views: LinkPreviewView[] = [];
    for (const [url, target] of targets) {
        const row = target.kind === "work" ? workBySlug.get(target.slug) : postBySlug.get(target.slug);
        if (!row) {
            continue;
        }
        const title = parseLocalized(row.title);
        const description = parseLocalized("summary" in row ? row.summary : row.excerpt);
        const cover = coverUrlFor(row.cover);
        const hue = "summary" in row
            ? await hueFor("work", row.slug)
            : (await hueFor("work", row.relatedWorkSlug)) ?? (await hueFor("category", (parseLocalized(row.category)?.en ?? "").trim().toLowerCase()));

        views.push({
            url,
            kind: target.kind,
            title: title ? pick(title, locale) : row.slug,
            description: description ? pick(description, locale) : null,
            siteName: null,
            domain: displayDomain(process.env.SITE_URL ?? url),
            image: cover ? { src: cover.src, placeholder: cover.placeholder, width: cover.width, height: cover.height } : null,
            faviconUrl: null,
            hue,
            status: "ok",
            lastError: null,
        });
    }
    return views;
}

/**
 * Previews for `urls`, keyed by the URL exactly as given — one or two
 * indexed queries for the whole document, no network. URLs with nothing
 * usable are simply absent from the map; the renderer treats "absent" as
 * "plain link", which is also how a page behaves before any snapshot
 * exists.
 */
export async function getLinkPreviews(
    urls: readonly string[],
    locale: ContentLocale = "en",
    options: { includeErrors?: boolean } = {},
): Promise<LinkPreviewMap> {
    const unique = [...new Set(urls)];
    const internal: [string, InternalTarget][] = [];
    const external: string[] = [];
    for (const url of unique) {
        const target = parseInternalTarget(url);
        if (target) {
            internal.push([url, target]);
        } else {
            external.push(url);
        }
    }

    const views = [...(await externalViews(external, options.includeErrors ?? false)), ...(await internalViews(internal, locale))];
    return Object.fromEntries(views.map((view) => [view.url, view]));
}

/** `getLinkPreviews` for every link in a document — what the public post/case-study pages call next to `getPostBySlug`/`getWorkBySlug`. */
export async function getLinkPreviewsForBlocks(blocks: readonly (Block | BlockInput)[], locale: ContentLocale = "en"): Promise<LinkPreviewMap> {
    const urls = collectLinkUrls(blocks);
    return urls.length === 0 ? {} : getLinkPreviews(urls, locale);
}
