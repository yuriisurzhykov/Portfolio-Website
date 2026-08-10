import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { findCurrentSlug, getPostBySlug } from "@portfolio/backend";
import { WorkDetailPage } from "@/views/work-detail";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
import { orDatabaseOutageFallback } from "@/shared/lib/db-outage-fallback";
import { getRequestLocale } from "@/shared/lib/get-request-locale";
import { cachedSiteContent, cachedWorkBySlug } from "@/shared/lib/cached-content";
import { NOINDEX } from "@/shared/lib/seo/noindex";
import { pickFor } from "@/shared/i18n";
import { alternatesFor, localizedPath } from "@/shared/lib/seo/alternates";
import { ogAlternateLocales, ogLocale, TWITTER_CARD } from "@/shared/lib/seo/open-graph";
import { SITE_URL } from "@/shared/lib/seo/site-url";
import { breadcrumbJsonLd, jsonLdGraph, personJsonLd, serializeJsonLd } from "@/shared/lib/seo/json-ld";
import { JsonLd } from "@/shared/lib/seo/JsonLd";
import { workOgImagePath } from "@/shared/lib/seo/og/paths";

interface PageProps {
    params: Promise<{ slug: string }>;
}

/** Same shape and same failure-classification reasoning as `journal/[slug]`'s — see its comment. */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const locale = await getRequestLocale();

    return orDatabaseOutageFallback(async () => {
        const [item, config] = await Promise.all([cachedWorkBySlug(slug, locale), cachedSiteContent("config")]);
        if (!item) {
            return NOINDEX;
        }

        const title = item.title;
        const description = pickFor(item.summary, locale);

        return {
            title,
            description,
            alternates: alternatesFor(`/work/${ slug }`, locale, item.availableLocales),
            openGraph: {
                type: "article",
                title,
                description,
                siteName: config.name,
                locale: ogLocale(locale),
                alternateLocale: ogAlternateLocales(locale),
                publishedTime: item.publishedAt ?? undefined,
                modifiedTime: item.contentUpdatedAt ?? item.publishedAt ?? undefined,
                // See `journal/[slug]/page.tsx`'s comment on the same line.
                images: [{ url: workOgImagePath(slug, locale), width: 1200, height: 630, alt: title }],
            },
            twitter: { card: TWITTER_CARD, title, description },
        };
    }, NOINDEX, `metadata for /work/${ slug }`);
}

export default async function Page({ params }: PageProps) {
    const { slug } = await params;
    const locale = await getRequestLocale();

    return renderOrServiceUnavailable(
        async () => {
            const item = await cachedWorkBySlug(slug, locale);
            if (!item) {
                // Same reasoning as `journal/[slug]`'s — see its comment.
                // Only when the item is MISSING, not when it merely has no
                // case study: that one exists, it just has no page here, so
                // redirecting anywhere would be a lie.
                const current = await findCurrentSlug("work", slug);
                if (current) {
                    permanentRedirect(localizedPath(`/work/${ current }`, locale));
                }
                notFound();
            }
            if (!item.caseStudy) {
                notFound();
            }
            // Same reasoning as journal/[slug]/page.tsx — the related
            // post's own body isn't rendered here, just its pick()'d title/
            // excerpt, so its body-document locale doesn't matter.
            const relatedPost = item.relatedPostSlug ? await getPostBySlug(item.relatedPostSlug) : null;
            const config = await cachedSiteContent("config");
            return { item, relatedPost, config };
        },
        ({ item, relatedPost, config }) => (
            <>
                {/* No `BlogPosting` here — a case study is not an article, and
                    the plan's structured-data rule is that markup describes
                    what the page shows. Person + breadcrumbs is what is
                    actually true of this page. */}
                <JsonLd
                    json={serializeJsonLd(
                        jsonLdGraph([
                            personJsonLd({
                                siteUrl: SITE_URL,
                                name: config.name,
                                sameAs: [config.social.github, config.social.linkedin],
                            }),
                            breadcrumbJsonLd(SITE_URL, [
                                { name: config.name, path: "/" },
                                { name: "Work", path: "/work" },
                                { name: item.title, path: `/work/${ item.slug }` },
                            ]),
                        ]),
                    )}
                />
                <WorkDetailPage item={item} relatedPost={relatedPost} />
            </>
        ),
    );
}
