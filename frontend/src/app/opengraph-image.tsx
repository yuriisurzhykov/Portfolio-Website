import { SITE_CONTENT_DEFAULTS } from "@portfolio/backend";
import { cachedSiteContent } from "@/shared/lib/cached-content";
import { orDatabaseOutageFallback } from "@/shared/lib/db-outage-fallback";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage, truncate } from "@/shared/lib/seo/og/render";

/**
 * The site's default link preview — inherited by every route that doesn't
 * ship its own `opengraph-image`.
 *
 * `alt` is a file-convention export and is therefore per-ROUTE, not per
 * item; `generateImageMetadata` could make it per-item, which is out of
 * proportion for preview alt text.
 */
export const alt = "Yurii Surzhykov — Android Platform/System Engineer";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// satori plus PNG encoding is real CPU on a small VPS, and this image only
// changes when the site's own name/role changes. The cache lives in
// `.next/cache` inside the release directory, so it goes cold on every
// deploy — accepted, not worked around.
export const revalidate = 3600;

export default async function Image() {
    // A DATABASE OUTAGE must degrade to a plain preview, never a 500 — a
    // missing card is tolerable, a broken image URL in someone's chat is
    // not. Anything else propagates; see `orDatabaseOutageFallback`.
    const [config, hero] = await Promise.all([
        orDatabaseOutageFallback(() => cachedSiteContent("config"), SITE_CONTENT_DEFAULTS.config, "default OG image config"),
        orDatabaseOutageFallback(() => cachedSiteContent("hero"), SITE_CONTENT_DEFAULTS.hero, "default OG image hero"),
    ]);

    return renderOgImage({
        eyebrow: config.role.en,
        title: config.name,
        subtitle: truncate(hero.subhead.en, 130),
        footer: config.email,
    });
}
