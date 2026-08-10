import type { Metadata } from "next";
import { filterWorkByTechSlug, findTechDisplayName, getAllWork, type ContentLocale } from "@portfolio/backend";
import { WorkListPage } from "@/views/work-list";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
import { orDatabaseOutageFallback } from "@/shared/lib/db-outage-fallback";
import { getRequestLocale } from "@/shared/lib/get-request-locale";
import { cachedSiteContent } from "@/shared/lib/cached-content";
import { NOINDEX } from "@/shared/lib/seo/noindex";
import { pickFor } from "@/shared/i18n";
import { alternatesFor } from "@/shared/lib/seo/alternates";
import { ogAlternateLocales, ogLocale, TWITTER_CARD } from "@/shared/lib/seo/open-graph";

// See app/(site)/page.tsx's comment — same reasoning, this list page would
// otherwise be baked in at build time and miss new work items until a redeploy.
export const dynamic = "force-dynamic";

/** Same reasoning as `journal/page.tsx`'s constant of the same name. */
const ALL_LOCALES: ContentLocale[] = ["en", "ru"];

interface PageProps {
    /** Next.js 16 route props: `searchParams` is a Promise, same as `params` elsewhere in this app. */
    searchParams: Promise<{ tech?: string }>;
}

/**
 * `workPage.heading` is a localized ARRAY (two display lines), joined with
 * a space for the title — the visible heading in one string, which is what
 * the structured-data rule asks for.
 *
 * `?tech=` deliberately does not change the canonical: a filtered view of
 * the same ledger is the same page, and `alternatesFor("/work", ...)`
 * points every variant at the unfiltered URL.
 */
export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRequestLocale();

    // Explicit `<Metadata>` — see `journal/page.tsx`'s comment on the same call.
    return orDatabaseOutageFallback<Metadata>(async () => {
        const [workPage, config] = await Promise.all([cachedSiteContent("workPage"), cachedSiteContent("config")]);
        const title = pickFor(workPage.heading, locale).join(" ");
        const description = pickFor(workPage.description, locale);

        return {
            title,
            description,
            alternates: alternatesFor("/work", locale, ALL_LOCALES),
            openGraph: {
                type: "website",
                title,
                description,
                siteName: config.name,
                locale: ogLocale(locale),
                alternateLocale: ogAlternateLocales(locale),
            },
            twitter: { card: TWITTER_CARD, title, description },
        };
    }, NOINDEX, "metadata for /work");
}

export default async function Page({ searchParams }: PageProps) {
    const { tech } = await searchParams;

    return renderOrServiceUnavailable(
        () => Promise.all([getAllWork(), cachedSiteContent("workPage")]),
        ([allItems, workPage]) => {
            // Filtering client-side over an already-fetched, already-small
            // list (see tech-slug.ts's own comment on `filterWorkByTechSlug`)
            // — no second query, `tech` is just a JS-level view of the same
            // `allItems` this page already loaded.
            const items = tech ? filterWorkByTechSlug(allItems, tech) : allItems;
            const activeTech = tech ? { slug: tech, label: findTechDisplayName(allItems, tech) ?? tech } : null;

            return <WorkListPage items={items} workPage={workPage} activeTech={activeTech} />;
        },
    );
}
