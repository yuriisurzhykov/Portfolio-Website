import type { Metadata } from "next";
import { getFeaturedWork, getLatestPublishedPost, getPublishedTechSlugs, type ContentLocale } from "@portfolio/backend";
import { LandingPage } from "@/views/landing";
import { buildTechStackView } from "@/views/landing/tech-stack-view";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
import { orDatabaseOutageFallback } from "@/shared/lib/db-outage-fallback";
import { getRequestLocale } from "@/shared/lib/get-request-locale";
import { cachedSiteContent } from "@/shared/lib/cached-content";
import { NOINDEX } from "@/shared/lib/seo/noindex";
import { pickFor } from "@/shared/i18n";
import { alternatesFor } from "@/shared/lib/seo/alternates";
import { ogAlternateLocales, ogLocale, TWITTER_CARD } from "@/shared/lib/seo/open-graph";
import { DEFAULT_OG_IMAGE_PATH } from "@/shared/lib/seo/og/paths";
import { clampMetaDescription } from "@/shared/lib/seo/meta-description";
import { SITE_URL } from "@/shared/lib/seo/site-url";
import { jsonLdGraph, personJsonLd, serializeJsonLd } from "@/shared/lib/seo/json-ld";
import { JsonLd } from "@/shared/lib/seo/JsonLd";

// Without this, Next.js prerenders this page once at BUILD time (no
// dynamic route params, no cookies()/headers() usage — everything it needs
// to auto-detect "this can be static" is absent) and bakes in whatever
// getFeaturedWork()/getLatestPublishedPost() returned during that build.
// That defeats the actual point of moving content into a database: a new
// post/project added later (Phase 4's admin panel) wouldn't show up here
// until the next full rebuild+redeploy — the exact problem this migration
// exists to remove. Forcing dynamic rendering means every request re-runs
// the query, same as /journal/[slug] and /work/[slug] already do (Next.js
// marks those dynamic automatically because of their route params).
// Revisit once Phase 4 wires up `revalidatePath()` on publish — on-demand
// static regeneration would give this back its build-time performance
// without losing correctness.
export const dynamic = "force-dynamic";

/** Same reasoning as `journal/page.tsx`'s constant of the same name. */
const ALL_LOCALES: ContentLocale[] = ["en", "ru"];

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRequestLocale();

    // Explicit `<Metadata>` — see `journal/page.tsx`'s comment on the same call.
    return orDatabaseOutageFallback<Metadata>(async () => {
        const [config, hero] = await Promise.all([cachedSiteContent("config"), cachedSiteContent("hero")]);
        const title = `${ config.name } — ${ pickFor(config.role, locale) }`;
        // Clamped for the METADATA only — hero.subhead itself still renders
        // in full on the page (LandingPage reads `hero` directly, never this
        // variable). At 194 characters unclamped, this was overflowing a
        // search snippet; shortening the source copy to fit would have also
        // shrunk what a real visitor reads, which is the wrong fix for a
        // metadata-only concern. See meta-description.ts.
        const description = clampMetaDescription(pickFor(hero.subhead, locale));
        const path = alternatesFor("/", locale, ALL_LOCALES).canonical;

        return {
            title,
            description,
            alternates: alternatesFor("/", locale, ALL_LOCALES),
            openGraph: {
                type: "website",
                title,
                description,
                siteName: config.name,
                locale: ogLocale(locale),
                alternateLocale: ogAlternateLocales(locale),
                url: `${ SITE_URL }${ path }`,
                // Found on the live site (Phase 0 audit): with no `images`
                // here, Next.js never falls back to the file-convention
                // `app/opengraph-image.tsx` route — `og:image` (and, since
                // Twitter inherits it, `twitter:image` too) was simply
                // absent from every response. `DEFAULT_OG_IMAGE_PATH` is the
                // one existing constant that already named that route and
                // had never been wired to anything (seo/og/paths.ts).
                images: [{ url: DEFAULT_OG_IMAGE_PATH, width: 1200, height: 630, alt: title }],
            },
            twitter: { card: TWITTER_CARD, title, description },
        };
    }, NOINDEX, "metadata for /");
}

export default async function Page() {
    return renderOrServiceUnavailable(
        () =>
            Promise.all([
                getFeaturedWork(),
                getLatestPublishedPost(),
                // `cachedSiteContent`, not `getSiteContent`: `generateMetadata`
                // above already asked for `hero` and `config`, and the site
                // layout asks for `config` too.
                cachedSiteContent("hero"),
                cachedSiteContent("contact"),
                cachedSiteContent("principles"),
                cachedSiteContent("techStack"),
                cachedSiteContent("config"),
                getPublishedTechSlugs(),
            ]),
        ([featuredWork, latestPost, hero, contact, principles, techStack, config, publishedTechSlugs]) => (
            <>
                {/* The landing page is the Person entity's home — `@id` here is
                    the same `${SITE_URL}/#person` every other page references,
                    which is what consolidates them into one entity rather than
                    several same-named strangers. */}
                <JsonLd
                    json={serializeJsonLd(
                        jsonLdGraph([
                            personJsonLd({
                                siteUrl: SITE_URL,
                                name: config.name,
                                sameAs: [config.social.github, config.social.linkedin],
                            }),
                        ]),
                    )}
                />
                <LandingPage
                    featuredWork={featuredWork}
                    latestPost={latestPost}
                    hero={hero}
                    contact={contact}
                    principles={principles}
                    techStack={buildTechStackView(techStack, publishedTechSlugs)}
                    config={config}
                />
            </>
        ),
    );
}
