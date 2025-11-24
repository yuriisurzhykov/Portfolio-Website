import React, { type ReactNode } from "react";
import { I18nProvider } from "@/shared/i18n";
import { ThemeProvider } from "@/feature/theme";

type ProviderProperties = {
    children: ReactNode;
}

export const MainProviders = ({ children }: ProviderProperties) => {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="yuriisoft-app-theme">
            <I18nProvider>
                {children}
            </I18nProvider>
        </ThemeProvider>
    );
}