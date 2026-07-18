import type { Metadata } from "next";
import "@/app/styles/index.css";
import { themeVars } from "@/shared/ui/theme";
import { MainProviders } from "@/app/providers/MainProviders";
import { site } from "@/data/config";

export const metadata: Metadata = {
    title: site.name,
    description: "Systems engineer — event-driven architecture, navigation engines, and code-generation tooling for OEM Android platforms.",
};

/**
 * Root layout — html/body shell, design-token <style>, and the i18n/theme
 * providers. Deliberately has NO <Nav/>/<Footer/> here: the dev-only
 * /storybook route sits outside the (site) route group and must not get
 * that chrome (see app/(site)/layout.tsx and app/storybook/page.tsx).
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className="h-full">
            <head>
                <style dangerouslySetInnerHTML={{ __html: themeVars }} />
            </head>
            <body className="min-h-full flex flex-col antialiased">
                <MainProviders>
                    {children}
                </MainProviders>
            </body>
        </html>
    );
}
