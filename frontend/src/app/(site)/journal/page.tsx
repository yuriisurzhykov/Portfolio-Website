import type { Metadata } from "next";
import { getJournalEntries, type ContentLocale } from "@portfolio/backend";
import { JournalListPage } from "@/views/journal-list";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
import { orDatabaseOutageFallback } from "@/shared/lib/db-outage-fallback";
import { getRequestLocale } from "@/shared/lib/get-request-locale";
import { cachedSiteContent } from "@/shared/lib/cached-content";
import { NOINDEX } from "@/shared/lib/seo/noindex";
import { pickFor } from "@/shared/i18n";
import { alternatesFor } from "@/shared/lib/seo/alternates";
import { ogAlternateLocales, ogLocale, TWITTER_CARD } from "@/shared/lib/seo/open-graph";

// See app/(site)/page.tsx's comment — same reasoning, this list page would
// otherwise be baked in at build time and miss new posts until a redeploy.
export const dynamic = "force-dynamic";

/**
 * Every locale, always: `journalPage.heading`/`description` are
 * `LocalizedText`, so both halves exist by construction — this is a
 * checkable fact, not a decision (see `alternatesFor`).
 */
const ALL_LOCALES: ContentLocale[] = ["en", "ru"];

/**
 * Title and description come from the live `journalPage` section, not from
 * a constant: this heading is editable from the admin panel, and a copy
 * hardcoded here would silently drift away from what the page shows. It
 * costs no extra query — the page below reads the same key through the
 * same memoized binding.
 */
export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRequestLocale();

    // Explicit `<Metadata>`: without it TypeScript infers the narrow shape
    // of the literal below and rejects `NOINDEX` as the fallback.
    return orDatabaseOutageFallback<Metadata>(async () => {
        const [journalPage, config] = await Promise.all([
            cachedSiteContent("journalPage"),
            cachedSiteContent("config"),
        ]);
        const title = pickFor(journalPage.heading, locale);
        const description = pickFor(journalPage.description, locale);

        return {
            title,
            description,
            alternates: alternatesFor("/journal", locale, ALL_LOCALES),
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
    }, NOINDEX, "metadata for /journal");
}

export default async function Page() {
    return renderOrServiceUnavailable(
        () => Promise.all([getJournalEntries(), cachedSiteContent("journalPage")]),
        ([entries, journalPage]) => <JournalListPage entries={entries} journalPage={journalPage} />,
    );
}
