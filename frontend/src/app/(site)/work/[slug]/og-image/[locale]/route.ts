import { SITE_CONTENT_DEFAULTS } from "@portfolio/backend";
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

    return renderOgImage({
        // `Work.title` is a plain string, not LocalizedText — a project
        // name is the same in both languages by design (see work.ts).
        eyebrow: contentLocale === "ru" ? "Кейс" : "Case study",
        title: truncate(item?.title ?? config.name, 72),
        subtitle: truncate(item ? pickFor(item.summary, contentLocale) : "", 130),
        footer: config.name,
    });
}
