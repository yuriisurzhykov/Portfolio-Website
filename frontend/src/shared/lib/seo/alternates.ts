import type { ContentLocale } from "@portfolio/backend";
import { RU_PREFIX } from "@/shared/lib/locale-constants";

/**
 * `Metadata["alternates"]`'s two fields, as RELATIVE paths — Next.js turns
 * them into absolute URLs itself using `metadataBase` (set in the root
 * layout), so there is no `absoluteUrl()` helper anywhere in the app
 * except the two files that emit raw strings rather than `Metadata`
 * (`robots.ts`, `sitemap.ts`).
 */
export interface AlternatesConfig {
    canonical: string;
    languages: Record<string, string>;
}

/**
 * `/journal/x` → `/ru/journal/x`; the site root stays `/ru`, NOT `/ru/`.
 *
 * Exported because `app/sitemap.ts` needs the identical mapping, and its
 * first version rebuilt it inline — which produced `https://…/ru/` for the
 * landing page, a different URL from the `/ru` the site actually serves.
 * Caught by reading a real sitemap response, not by a type error.
 */
export function localizedPath(path: string, locale: ContentLocale): string {
    if (locale !== "ru") {
        return path;
    }
    return path === "/" ? RU_PREFIX : `${ RU_PREFIX }${ path }`;
}

/**
 * Canonical + hreflang for one locale-neutral path. Changes for exactly
 * one reason: the policy for localized URLs changed.
 *
 * `availableLocales` is never computed at the call site — for posts and
 * work items it arrives ready-made from the domain (see
 * `PostSummary.availableLocales`), and list pages/the landing page pass
 * the full set, which is a statement of a fact checkable on the spot:
 * both i18n dictionaries are bundled at build time, and `journalPage`/
 * `workPage` are `LocalizedText`, so both halves always exist.
 *
 * A locale that isn't in the list is not declared as an alternative at
 * all, and a page requested in that locale canonicalizes to the English
 * URL. `/ru/journal/x` without a Russian body renders the English body
 * (see `getPostBySlug`'s fallback) — that is a duplicate, and canonical
 * is the direct instruction not to treat it as a page of its own.
 */
export function alternatesFor(
    path: string,
    locale: ContentLocale,
    availableLocales: ContentLocale[],
): AlternatesConfig {
    const languages: Record<string, string> = {};
    for (const available of availableLocales) {
        languages[available] = localizedPath(path, available);
    }
    // x-default is what a search engine serves a visitor whose language
    // matches nothing declared above — English is the site's original.
    languages["x-default"] = path;

    return {
        canonical: availableLocales.includes(locale) ? localizedPath(path, locale) : path,
        languages,
    };
}
