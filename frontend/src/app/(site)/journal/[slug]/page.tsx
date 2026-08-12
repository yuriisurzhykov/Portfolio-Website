import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { findCurrentSlug, getPostPreview, getWorkBySlug, resolvePostHue, type PostDetail } from "@portfolio/backend";
import { JournalDetailPage } from "@/views/journal-detail";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
import { orDatabaseOutageFallback } from "@/shared/lib/db-outage-fallback";
import { getRequestLocale } from "@/shared/lib/get-request-locale";
import { cachedPostBySlug, cachedSiteContent } from "@/shared/lib/cached-content";
import { isAdminPreviewRequest } from "@/shared/lib/preview";
import { NOINDEX } from "@/shared/lib/seo/noindex";
import { pickFor } from "@/shared/i18n";
import { alternatesFor, localizedPath } from "@/shared/lib/seo/alternates";
import { ogAlternateLocales, ogLocale, TWITTER_CARD } from "@/shared/lib/seo/open-graph";
import { clampMetaDescription } from "@/shared/lib/seo/meta-description";
import { SITE_URL } from "@/shared/lib/seo/site-url";
import { blogPostingJsonLd, breadcrumbJsonLd, jsonLdGraph, personJsonLd, serializeJsonLd } from "@/shared/lib/seo/json-ld";
import { JsonLd } from "@/shared/lib/seo/JsonLd";
import { postOgImagePath } from "@/shared/lib/seo/og/paths";

interface PageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * `getPostPreview` (draft-priority, never lifecycle-filtered) for an
 * authenticated admin's `?preview=1`, the real public `cachedPostBySlug`
 * otherwise — resolved once per request and reused by both
 * `generateMetadata` and the page body, same reasoning `cachedPostBySlug`
 * itself already documents (one memoized read per request, not per
 * caller). NOT wrapped in React's own `cache()` like the public reader —
 * a preview is a rare, admin-only path where the tiny duplicate read cost
 * isn't worth a second module-level cache binding for.
 */
async function resolvePost(slug: string, locale: Awaited<ReturnType<typeof getRequestLocale>>, searchParams: Record<string, string | string[] | undefined>): Promise<{ post: PostDetail | null; isPreview: boolean }> {
    if (await isAdminPreviewRequest(searchParams)) {
        return { post: await getPostPreview(slug, locale), isPreview: true };
    }
    return { post: await cachedPostBySlug(slug, locale), isPreview: false };
}

/**
 * `cachedPostBySlug`, not `getPostBySlug` — this is the hottest public
 * route and the page component below asks for the exact same post. See
 * `shared/lib/cached-content.ts` for why the memoized binding has to be
 * imported rather than created here.
 *
 * A DATABASE OUTAGE degrades to `noindex` rather than to an empty object.
 * The page itself answers one with `<ServiceUnavailable/>` at status
 * **200**, so a crawler arriving mid-outage could otherwise replace a real
 * article in its index with a placeholder. The correct answer would be 503
 * with `Retry-After`, which a Server Component cannot set; telling the
 * crawler not to index THIS rendering is the part that is available here.
 * Anything else — a bug in this function — propagates and surfaces as a
 * real error; see `orDatabaseOutageFallback` for why that distinction is
 * not optional.
 */
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const locale = await getRequestLocale();
    const search = await searchParams;

    return orDatabaseOutageFallback(async () => {
        const [{ post, isPreview }, config] = await Promise.all([resolvePost(slug, locale, search), cachedSiteContent("config")]);
        if (!post) {
            return NOINDEX;
        }
        // A preview must never be indexed, even for a post that's
        // otherwise perfectly indexable once published — it's shown at
        // the SAME URL a real reader eventually gets, and a crawler must
        // never mistake a work-in-progress draft for the final article.
        if (isPreview) {
            return NOINDEX;
        }

        const title = pickFor(post.title, locale);
        const description = clampMetaDescription(pickFor(post.excerpt, locale));
        const path = alternatesFor(`/journal/${ slug }`, locale, post.availableLocales).canonical;

        return {
            title,
            description,
            alternates: alternatesFor(`/journal/${ slug }`, locale, post.availableLocales),
            openGraph: {
                type: "article",
                title,
                description,
                siteName: config.name,
                locale: ogLocale(locale),
                alternateLocale: ogAlternateLocales(locale),
                url: `${ SITE_URL }${ path }`,
                publishedTime: post.publishedAt ?? undefined,
                modifiedTime: post.contentUpdatedAt ?? post.publishedAt ?? undefined,
                // Relative — `metadataBase` makes it absolute. Set by hand
                // rather than through the `opengraph-image.tsx` convention;
                // see `shared/lib/seo/og/paths.ts` for the build output
                // that forced that correction. `twitter:image` is derived
                // from this automatically.
                images: [{ url: postOgImagePath(slug, locale), width: 1200, height: 630, alt: title }],
            },
            twitter: { card: TWITTER_CARD, title, description },
        };
    }, NOINDEX, `metadata for /journal/${ slug }`);
}

export default async function Page({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const locale = await getRequestLocale();
    const search = await searchParams;

    return renderOrServiceUnavailable(
        async () => {
            const { post, isPreview } = await resolvePost(slug, locale, search);
            if (!post) {
                // A preview's slug is exactly what the admin typed into
                // the editor's URL bar a moment ago — there's no crawler
                // to redirect and no accumulated signal to carry over, so
                // this skips straight to `notFound()` rather than
                // resolving a public rename.
                if (!isPreview) {
                    // Renamed, not gone: answer the old address with a
                    // permanent redirect so external links keep working and the
                    // signals it accumulated move to the new URL. Without this
                    // the IndexNow submission for `previousSlug` would send a
                    // crawler to a 404, which drops the URL instead of
                    // forwarding it. Looked up only AFTER the real post misses,
                    // so a slug currently in use always wins over one that
                    // merely used to point somewhere.
                    const current = await findCurrentSlug("post", slug);
                    if (current) {
                        permanentRedirect(localizedPath(`/journal/${ current }`, locale));
                    }
                }
                notFound();
            }
            // Related work's own body isn't rendered on this page (see
            // JournalDetailPage — only `summary`/`title`, both plain
            // `pick()`-resolved metadata) — locale doesn't need threading
            // through here at all.
            const relatedWork = post.relatedWorkSlug ? await getWorkBySlug(post.relatedWorkSlug) : null;
            const config = await cachedSiteContent("config");
            const hue = await resolvePostHue({ categoryEn: post.category.en, relatedWorkSlug: post.relatedWorkSlug });
            return { post, relatedWork, config, hue, isPreview };
        },
        ({ post, relatedWork, config, hue, isPreview }) => (
            <>
                {/* Person and BlogPosting travel together in one @graph: Google
                    wants `author` to be a Person object with a `name`, and
                    validators don't resolve an `@id` pointing at another page —
                    a bare cross-page reference reads as a missing field. */}
                <JsonLd
                    json={serializeJsonLd(
                        jsonLdGraph([
                            personJsonLd({
                                siteUrl: SITE_URL,
                                name: config.name,
                                sameAs: [config.social.github, config.social.linkedin],
                            }),
                            blogPostingJsonLd({
                                siteUrl: SITE_URL,
                                path: `/journal/${ post.slug }`,
                                headline: pickFor(post.title, locale),
                                description: pickFor(post.excerpt, locale),
                                image: `${ SITE_URL }${ postOgImagePath(post.slug, locale) }`,
                                datePublished: post.publishedAt,
                                dateModified: post.contentUpdatedAt ?? post.publishedAt,
                                inLanguage: locale,
                            }),
                            breadcrumbJsonLd(SITE_URL, [
                                { name: config.name, path: "/" },
                                { name: "Journal", path: "/journal" },
                                { name: pickFor(post.title, locale), path: `/journal/${ post.slug }` },
                            ]),
                        ]),
                    )}
                />
                <JournalDetailPage post={post} relatedWork={relatedWork} hue={hue} isPreview={isPreview} />
            </>
        ),
    );
}
