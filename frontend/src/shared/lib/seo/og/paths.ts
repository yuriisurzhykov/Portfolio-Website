import type { ContentLocale } from "@portfolio/backend";

/**
 * Where each page's Open Graph image lives.
 *
 * These are explicit route handlers rather than Next.js's
 * `opengraph-image.tsx` file convention, and that was a CORRECTION, not the
 * first design — found from a real `next build` after the convention was
 * already in place. Next.js appends a content hash to the generated route
 * of a file-based OG image under a dynamic segment
 * (`/journal/[slug]/opengraph-image-je0ukm`), and that hash changes
 * whenever the template file changes. Nothing outside Next.js can name that
 * URL, which breaks the two places that must: the JSON-LD `image` property,
 * and the e2e baseline that opens the image route directly.
 *
 * With an explicit route, one function names the URL and `og:image`,
 * `twitter:image`, JSON-LD and the test all use it. Alt text improves as a
 * side effect: the file convention's `alt` export is per-ROUTE (one string
 * for every post), whereas `openGraph.images[].alt` set in
 * `generateMetadata` is per item.
 *
 * The locale is a PATH SEGMENT, not a query parameter or a request header.
 * Reading either would make the route dynamic and cost the `revalidate`
 * cache that keeps satori off the CPU during a crawl — while a segment
 * gives every (item, locale) pair its own cacheable URL. That is also what
 * makes the Cyrillic half of the committed font subset reachable at all:
 * with an English-only card, no Russian glyph is ever drawn, and the
 * screenshot baseline could not have caught a broken subset.
 *
 * The site-wide default at `app/opengraph-image.tsx` keeps the file
 * convention — a static segment gets no hash, so none of the above applies.
 */
export const DEFAULT_OG_IMAGE_PATH = "/opengraph-image";

export function postOgImagePath(slug: string, locale: ContentLocale): string {
    return `/journal/${ slug }/og-image/${ locale }`;
}

export function workOgImagePath(slug: string, locale: ContentLocale): string {
    return `/work/${ slug }/og-image/${ locale }`;
}

/** Route params are strings; anything unrecognized draws the English card rather than 404ing on a preview image. */
export function toOgLocale(value: string): ContentLocale {
    return value === "ru" ? "ru" : "en";
}
