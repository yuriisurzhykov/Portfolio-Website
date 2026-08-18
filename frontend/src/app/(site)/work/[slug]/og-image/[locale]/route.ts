import { resolveWorkHue, SITE_CONTENT_DEFAULTS } from "@portfolio/backend";
import { pickFor } from "@/shared/i18n";
import { cachedSiteContent, cachedWorkBySlug } from "@/shared/lib/cached-content";
import { orDatabaseOutageFallback } from "@/shared/lib/db-outage-fallback";
import { toOgLocale } from "@/shared/lib/seo/og/paths";
import { renderOgImage, truncate } from "@/shared/lib/seo/og/render";

export const revalidate = 3600;

/** Same caching and failure-classification reasoning as `journal/[slug]/og-image/[locale]/route.ts`. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; locale: string }> }) {
    const { slug, locale } = await params;
    const contentLocale = toOgLocale(locale);

    const [item, config] = await Promise.all([
        orDatabaseOutageFallback(() => cachedWorkBySlug(slug), null, `OG image for /work/${ slug }`),
        orDatabaseOutageFallback(() => cachedSiteContent("config"), SITE_CONTENT_DEFAULTS.config, "OG image site config"),
    ]);

    // `resolveWorkHue`, not the site-default hue `renderOgImage` falls
    // back to without this — added 2026-08-11 (Work Item Covers & Unified
    // Identity Hue) once `Work` got its own guaranteed-unique identity, so
    // the OG card matches the real generated cover's/detail-page's own
    // hue instead of every project sharing the same default orange. A
    // database outage degrades this to `undefined` (the site's default),
    // same reasoning as the journal route's identical fallback.
    const hue = item
        ? await orDatabaseOutageFallback(() => resolveWorkHue(item.slug), undefined, `OG hue for /work/${ slug }`)
        : undefined;

    return renderOgImage({
        eyebrow: contentLocale === "ru" ? "Кейс" : "Case study",
        title: truncate(item ? pickFor(item.title, contentLocale) : config.name, 72),
        subtitle: truncate(item ? pickFor(item.summary, contentLocale) : "", 130),
        footer: config.name,
        hue,
    });
}
