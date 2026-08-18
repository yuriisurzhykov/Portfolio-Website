import { resolvePostHue, SITE_CONTENT_DEFAULTS } from "@portfolio/backend";
import { pickFor } from "@/shared/i18n";
import { cachedPostBySlug, cachedSiteContent } from "@/shared/lib/cached-content";
import { orDatabaseOutageFallback } from "@/shared/lib/db-outage-fallback";
import { toOgLocale } from "@/shared/lib/seo/og/paths";
import { renderOgImage, truncate } from "@/shared/lib/seo/og/render";

// satori plus PNG encoding is real CPU on a small VPS, and this image only
// changes when the post's title does. The cache lives in `.next/cache`
// inside the release directory, so it goes cold on every deploy — accepted,
// not worked around. Nothing in this handler reads the request, so each
// (slug, locale) URL stays cacheable; see `seo/og/paths.ts` for why the
// locale is a path segment rather than a header or a query parameter.
export const revalidate = 3600;

/**
 * A DATABASE OUTAGE degrades to the site's own name rather than a 500 — a
 * bland preview card is tolerable, a broken image in someone's chat is not.
 * Any other failure propagates: a bug in the template hidden behind a
 * default card would never be noticed (see `orDatabaseOutageFallback`).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; locale: string }> }) {
    const { slug, locale } = await params;
    const contentLocale = toOgLocale(locale);

    const [post, config] = await Promise.all([
        orDatabaseOutageFallback(() => cachedPostBySlug(slug), null, `OG image for /journal/${ slug }`),
        orDatabaseOutageFallback(() => cachedSiteContent("config"), SITE_CONTENT_DEFAULTS.config, "OG image site config"),
    ]);

    // `resolvePostHue`, not the bare `resolveCategoryHue` — same function
    // the real generated cover uses (`covers.ts`), so a post linked to a
    // Work project (`relatedWorkSlug`) shows the SAME hue on both its OG
    // card and its actual cover/detail-page accent, not two different
    // colors for the same post. Always the ENGLISH category (never the
    // locale-picked one) — a hue must not depend on the reader's language,
    // since the two locale cards for one post are meant to look like the
    // same post. A database outage degrades this to `undefined` (the
    // site's default hue, via `renderOgImage`'s own fallback) rather than
    // failing the whole card.
    const hue = post
        ? await orDatabaseOutageFallback(
            () => resolvePostHue({ categoryEn: post.category.en, relatedWorkSlug: post.relatedWorkSlug }),
            undefined,
            `OG hue for /journal/${ slug }`,
        )
        : undefined;

    return renderOgImage({
        eyebrow: post ? pickFor(post.category, contentLocale) : "Journal",
        title: truncate(post ? pickFor(post.title, contentLocale) : config.name, 72),
        subtitle: truncate(post ? pickFor(post.excerpt, contentLocale) : "", 130),
        footer: config.name,
        hue,
    });
}
