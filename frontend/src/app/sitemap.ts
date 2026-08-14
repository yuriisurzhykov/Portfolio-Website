import type { MetadataRoute } from "next";
import { getAllWork, getJournalEntries, type ContentLocale } from "@portfolio/backend";
import { orDatabaseOutageFallback } from "@/shared/lib/db-outage-fallback";
import { localizedPath } from "@/shared/lib/seo/alternates";
import { SITE_URL } from "@/shared/lib/seo/site-url";

// Without this the map is baked at build time and stops reflecting content
// published afterwards — the same trap `(site)/journal/page.tsx` carries
// this line for.
export const dynamic = "force-dynamic";

const ALL_LOCALES: ContentLocale[] = ["en", "ru"];

/**
 * Named, module-level, and used by BOTH the normal path and the failure
 * path below — not a literal inside the `catch`. Two copies of this list
 * would drift apart silently within a year.
 *
 * No `lastModified` on these entries at all. Filling in `new Date()` is
 * the exact defect `Post.contentUpdatedAt` was added to avoid: the map
 * would claim on every single request that the landing page and both list
 * pages just changed, which is the canonical way to make Google stop
 * trusting `lastmod` across the whole site. A missing `lastmod` is
 * allowed; a false one is not.
 */
const STATIC_PATHS = ["/", "/journal", "/work"];

function entryFor(path: string, availableLocales: ContentLocale[], lastModified?: string): MetadataRoute.Sitemap[number] {
    // `localizedPath`, not a second inline `/ru` concatenation — the first
    // version of this file had one, and it emitted `.../ru/` for the
    // landing page where the site serves `.../ru`.
    const languages: Record<string, string> = {};
    for (const locale of availableLocales) {
        languages[locale] = `${ SITE_URL }${ localizedPath(path, locale) }`;
    }

    return {
        url: `${ SITE_URL }${ path }`,
        ...(lastModified ? { lastModified } : {}),
        alternates: { languages },
    };
}

/**
 * Every URL here must actually serve a page — each filter below repeats
 * exactly the guard that sits in front of `notFound()` in the matching
 * route, because a sitemap full of guaranteed 404s is reported as an error
 * in Search Console:
 *
 * - posts need `status === "published"` AND `hasBody`. Status alone drops
 *   the `upcoming` stubs but not a published post whose body document was
 *   never written, and `/journal/[slug]` calls `notFound()` on that one.
 * - work items need `hasCaseStudy` — `getAllWork()` returns every
 *   published item, while `/work/[slug]` 404s when the case study is
 *   empty.
 *
 * On a DATABASE OUTAGE the static minimum is served instead of a 500, and
 * the reason is worth writing down because it is not readable from the
 * code: a URL missing from a sitemap is NOT a signal to a search engine
 * that the page was removed, whereas repeated 5xx on the sitemap IS a
 * negative signal about the site. The trade is between neutral and
 * harmful, not "something is better than nothing".
 *
 * That argument covers an outage and nothing else. A bug in the mapping
 * below must NOT be absorbed by the same fallback — it would serve three
 * URLs instead of thirty, indefinitely, with nothing in the log; see
 * `orDatabaseOutageFallback`.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticEntries = STATIC_PATHS.map((path) => entryFor(path, ALL_LOCALES));

    return orDatabaseOutageFallback(async () => {
        const [posts, work] = await Promise.all([getJournalEntries(), getAllWork()]);

        return [
            ...staticEntries,
            ...posts
                .filter((post) => post.status === "published" && post.hasBody)
                .map((post) =>
                    entryFor(`/journal/${ post.slug }`, post.availableLocales, post.contentUpdatedAt ?? post.publishedAt ?? undefined),
                ),
            ...work
                .filter((item) => item.hasCaseStudy)
                .map((item) =>
                    entryFor(`/work/${ item.slug }`, item.availableLocales, item.contentUpdatedAt ?? item.publishedAt ?? undefined),
                ),
        ];
    }, staticEntries, "sitemap.xml");
}
