import type { ContentLocale } from "@portfolio/backend";

/**
 * Open Graph locale codes, which use an UNDERSCORE (`en_US`), not the
 * hyphen of a BCP-47 tag. This is the single most common mistake in an OG
 * block and it fails silently: no validator objects, the field is just
 * ignored. One table, so it can only be wrong in one place.
 */
const OG_LOCALES: Record<ContentLocale, string> = { en: "en_US", ru: "ru_RU" };

export function ogLocale(locale: ContentLocale): string {
    return OG_LOCALES[locale];
}

/** Every OG locale except the one being rendered — what `openGraph.alternateLocale` expects. */
export function ogAlternateLocales(locale: ContentLocale): string[] {
    return (Object.keys(OG_LOCALES) as ContentLocale[])
        .filter((candidate) => candidate !== locale)
        .map((candidate) => OG_LOCALES[candidate]);
}

/**
 * Set explicitly on every public route. Next.js does add `twitter:image`
 * by itself once a file-based `opengraph-image` exists, but that does not
 * make the card large — and the difference between `summary` and this is a
 * thumbnail beside the text versus a full-width image above it.
 *
 * No `site`/`creator`: `config.social` has GitHub and LinkedIn only, there
 * is no X account to attribute. A card without a handle renders fine.
 */
export const TWITTER_CARD = "summary_large_image" as const;
