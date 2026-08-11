import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { findCurrentSlug, getPostBySlug, getWorkPreview, type WorkDetail } from "@portfolio/backend";
import { WorkDetailPage } from "@/views/work-detail";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
import { orDatabaseOutageFallback } from "@/shared/lib/db-outage-fallback";
import { getRequestLocale } from "@/shared/lib/get-request-locale";
import { cachedSiteContent, cachedWorkBySlug } from "@/shared/lib/cached-content";
import { isAdminPreviewRequest } from "@/shared/lib/preview";
import { NOINDEX } from "@/shared/lib/seo/noindex";
import { pickFor } from "@/shared/i18n";
import { alternatesFor, localizedPath } from "@/shared/lib/seo/alternates";
import { ogAlternateLocales, ogLocale, TWITTER_CARD } from "@/shared/lib/seo/open-graph";
import { clampMetaDescription } from "@/shared/lib/seo/meta-description";
import { SITE_URL } from "@/shared/lib/seo/site-url";
import { breadcrumbJsonLd, jsonLdGraph, personJsonLd, serializeJsonLd } from "@/shared/lib/seo/json-ld";
import { JsonLd } from "@/shared/lib/seo/JsonLd";
import { workOgImagePath } from "@/shared/lib/seo/og/paths";

interface PageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Work's half of `journal/[slug]/page.tsx`'s `resolvePost` — same reasoning, same admin-only draft-preview gate. */
async function resolveWork(slug: string, locale: Awaited<ReturnType<typeof getRequestLocale>>, searchParams: Record<string, string | string[] | undefined>): Promise<{ item: WorkDetail | null; isPreview: boolean }> {
    if (await isAdminPreviewRequest(searchParams)) {
        return { item: await getWorkPreview(slug, locale), isPreview: true };
    }
    return { item: await cachedWorkBySlug(slug, locale), isPreview: false };
}

/** Same shape and same failure-classification reasoning as `journal/[slug]`'s — see its comment. */
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const locale = await getRequestLocale();
    const search = await searchParams;

    return orDatabaseOutageFallback(async () => {
        const [{ item, isPreview }, config] = await Promise.all([resolveWork(slug, locale, search), cachedSiteContent("config")]);
        if (!item) {
            return NOINDEX;
        }
        // Same reasoning as `journal/[slug]`'s identical check — a preview
        // must never be indexed, even for an otherwise-indexable item.
        if (isPreview) {
            return NOINDEX;
        }

        const title = item.title;
        const description = clampMetaDescription(pickFor(item.summary, locale));
        const path = alternatesFor(`/work/${ slug }`, locale, item.availableLocales).canonical;

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
                url: `${ SITE_URL }${ path }`,
                publishedTime: item.publishedAt ?? undefined,
                modifiedTime: item.contentUpdatedAt ?? item.publishedAt ?? undefined,
                // See `journal/[slug]/page.tsx`'s comment on the same line.
                images: [{ url: workOgImagePath(slug, locale), width: 1200, height: 630, alt: title }],
            },
            twitter: { card: TWITTER_CARD, title, description },
        };
    }, NOINDEX, `metadata for /work/${ slug }`);
}

export default async function Page({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const locale = await getRequestLocale();
    const search = await searchParams;

    return renderOrServiceUnavailable(
        async () => {
            const { item, isPreview } = await resolveWork(slug, locale, search);
            if (!item) {
                // Same "skip the public rename lookup for a preview" reasoning as `journal/[slug]`'s — see its comment.
                if (!isPreview) {
                    // Same reasoning as `journal/[slug]`'s — see its comment.
                    // Only when the item is MISSING, not when it merely has no
                    // case study: that one exists, it just has no page here, so
                    // redirecting anywhere would be a lie.
                    const current = await findCurrentSlug("work", slug);
                    if (current) {
                        permanentRedirect(localizedPath(`/work/${ current }`, locale));
                    }
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
            return { item, relatedPost, config, isPreview };
        },
        ({ item, relatedPost, config, isPreview }) => (
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
                <WorkDetailPage item={item} relatedPost={relatedPost} isPreview={isPreview} />
            </>
        ),
    );
}
