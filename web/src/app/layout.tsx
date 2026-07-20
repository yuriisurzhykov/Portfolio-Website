import type { Metadata } from "next";
import "@/app/styles/index.css";
import { themeVars } from "@/shared/ui/theme";
import { MainProviders } from "@/app/providers/MainProviders";
import { site } from "@/data/config";
import { getRequestLocale } from "@/shared/lib/get-request-locale";

export const metadata: Metadata = {
    title: site.name,
    description: "Systems engineer — event-driven architecture, navigation engines, and code-generation tooling for OEM Android platforms.",
};

/**
 * Root layout — html/body shell, design-token <style>, and the i18n/theme
 * providers. Deliberately has NO <Nav/>/<Footer/> here: the dev-only
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
            <head>
                <style dangerouslySetInnerHTML={{ __html: themeVars }} />
            </head>
            <body className="min-h-full flex flex-col antialiased">
                <MainProviders initialLanguage={locale}>
                    {children}
                </MainProviders>
            </body>
        </html>
    );
}
