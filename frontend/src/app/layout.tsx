import type { Metadata } from "next";
import { SITE_CONTENT_DEFAULTS } from "@portfolio/backend";
import "@/app/styles/index.css";
import { MainProviders } from "@/app/providers/MainProviders";
import { getRequestLocale } from "@/shared/lib/get-request-locale";
import { IS_INDEXABLE, SITE_URL } from "@/shared/lib/seo/site-url";
import { INDEXABLE, NOINDEX } from "@/shared/lib/seo/noindex";

/**
 * Verification tokens for the three consoles this site actually targets.
 * Google alone would be inconsistent — IndexNow (see
 * `shared/lib/seo/index-now.ts`) aims squarely at Bing and Yandex, which
 * is also why Bing needs `other["msvalidate.01"]`: Next.js has named
 * fields for Google and Yandex, and nothing for Bing.
 *
 * Assembled conditionally so an unset variable means NO tag, rather than
 * `<meta name="google-site-verification" content="">` — noise that looks
 * exactly like a verification that broke.
 */
function siteVerification(): Metadata["verification"] {
    const google = process.env.SEO_VERIFICATION_GOOGLE;
    const yandex = process.env.SEO_VERIFICATION_YANDEX;
    const bing = process.env.SEO_VERIFICATION_BING;

    if (!google && !yandex && !bing) {
        return undefined;
    }
    return {
        ...(google ? { google } : {}),
        ...(yandex ? { yandex } : {}),
        ...(bing ? { other: { "msvalidate.01": bing } } : {}),
    };
}

// `SITE_CONTENT_DEFAULTS.config.name`, not a DB read — this metadata export
// has to stay a static object (not `generateMetadata()`) to cover EVERY
// route under this root layout, including /admin and /storybook, which
// must keep working with zero DB dependency. `(site)/layout.tsx`'s
// `getSiteConfigSafe()` is the one place `config` is actually read live,
// scoped to the public site chrome that can meaningfully reflect an admin
// edit; the <title>/description here are a build-time SEO concern, not
// something Phase 5 needed to make live-editable.
//
// `metadataBase` is what lets every route below write RELATIVE canonical/
// hreflang/OG-image values and have Next.js resolve them to absolute URLs
// — the reason no `absoluteUrl()` helper exists outside robots.ts and
// sitemap.ts.
//
// `robots` is set in BOTH directions, never left absent. Noindex is belt
// and braces with robots.txt: `Disallow` forbids crawling, not indexing,
// and a URL someone links to can reach the results page without ever being
// crawled. The indexable direction is not a no-op either — the default for
// an absent tag is `max-image-preview: standard`, which would show a
// thumbnail of the OG cards this site goes to the trouble of generating.
// See `seo/noindex.ts` for both constants.
//
// Every route that must never be indexed (`/admin`, `/storybook`,
// `/error/[code]`) declares `NOINDEX` itself; Next.js replaces this field
// wholesale from a nested segment rather than merging it, so those win.
export const metadata: Metadata = {
    metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
    title: SITE_CONTENT_DEFAULTS.config.name,
    description: "Systems engineer — event-driven architecture, navigation engines, and code-generation tooling for OEM Android platforms.",
    ...(IS_INDEXABLE ? INDEXABLE : NOINDEX),
    verification: siteVerification(),
};

/**
 * Root layout — html/body shell and the i18n/theme providers. Every
 * design token (color/dimension/radius/typography/motion/layout/z-index)
 * comes from the statically-imported `generated/tokens.css` (see
 * `app/styles/index.css`) — no runtime-injected `<style>` tag anymore.
 * Deliberately has NO <Nav/>/<Footer/> here: the dev-only
 * /storybook route sits outside the (site) route group and must not get
 * that chrome (see app/(site)/layout.tsx and app/storybook/page.tsx).
 *
 * `getRequestLocale()` reads the `x-locale` header `proxy.ts` set for this
 * request (see its `handleLocale`) and feeds it straight into
 * `<MainProviders initialLanguage>` — this is what makes a `/ru/...` URL
 * render Russian in the actual server-rendered HTML instead of only after
 * client hydration + a manual toggle click. `/admin`/`/api` requests never
 * carry the header at all, so this is always `"en"` there — correct, the
 * admin UI is intentionally English-only (see the migration plan).
 */
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const locale = await getRequestLocale();

    return (
        <html lang={locale} className="h-full">
            <body className="min-h-full flex flex-col antialiased">
                <MainProviders initialLanguage={locale}>
                    {children}
                </MainProviders>
            </body>
        </html>
    );
}
