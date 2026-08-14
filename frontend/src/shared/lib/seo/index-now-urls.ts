import type { ContentChange, ContentLocale } from "@portfolio/backend";
import { localizedPath } from "./alternates";

/** The one place a domain `kind` becomes a URL segment — the knowledge `backend/` deliberately does not have. */
const SECTION: Record<ContentChange["kind"], string> = {
    post: "/journal",
    work: "/work",
};

function urlsForSlug(siteUrl: string, kind: ContentChange["kind"], slug: string, locales: ContentLocale[]): string[] {
    return locales.map((locale) => `${ siteUrl }${ localizedPath(`${ SECTION[kind] }/${ slug }`, locale) }`);
}

/**
 * Turns a domain event into the concrete addresses IndexNow should be told
 * about. Pure, so it can be reasoned about and mutation-tested without a
 * network anywhere near it.
 *
 * A rename produces BOTH sets, and submitting the old one is the half that
 * carries value: the old address answers with a permanent redirect (see
 * `backend/src/content/slug-history.ts`), so a crawler that refetches it
 * follows through to the new URL and moves the signals the old address had
 * accumulated. Submitting it while it merely 404'd — which is what this
 * did before the history table existed — told the crawler to drop the URL
 * instead of forwarding it.
 *
 * The sitemap expresses the Russian version as an `xhtml:link` on the same
 * entry, but IndexNow only understands bare URLs, so `/ru/...` has to be
 * listed in its own right.
 */
export function indexNowUrlsFor(change: ContentChange, siteUrl: string): string[] {
    const urls = urlsForSlug(siteUrl, change.kind, change.slug, change.availableLocales);
    if (change.previousSlug) {
        urls.push(...urlsForSlug(siteUrl, change.kind, change.previousSlug, change.availableLocales));
    }
    return urls;
}
