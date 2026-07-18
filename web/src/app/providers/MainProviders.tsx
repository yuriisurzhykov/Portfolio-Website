import React, { type ReactNode } from "react";
import { I18nProvider } from "@/shared/i18n";
import { ThemeProvider } from "@/shared/theme";

type ProviderProperties = {
    children: ReactNode;
}

export const MainProviders = ({ children }: ProviderProperties) => {
    return (
        <ThemeProvider>
            <I18nProvider>
                {children}
            </I18nProvider>
        </ThemeProvider>
    );
}