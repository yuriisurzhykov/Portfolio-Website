import React, { type ReactNode } from "react";
import { I18nProvider } from "@/shared/i18n";
import type { Language } from "@/shared/i18n";
import { ThemeProvider } from "@/shared/theme";

type ProviderProperties = {
    children: ReactNode;
    /** From `RootLayout`'s `getRequestLocale()` — absent (defaults to "en") for /admin and /storybook, which don't read a locale at all. */
    initialLanguage?: Language;
}

export const MainProviders = ({ children, initialLanguage }: ProviderProperties) => {
    return (
        <ThemeProvider>
            <I18nProvider initialLanguage={initialLanguage}>
                {children}
            </I18nProvider>
        </ThemeProvider>
    );
}