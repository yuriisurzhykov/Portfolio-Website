import React, { type ReactNode } from "react";
import { I18nProvider } from "@/shared/i18n";

type ProviderProperties = {
    children: ReactNode;
}

export const MainProviders = ({ children }: ProviderProperties) => {
    return (
        <I18nProvider>
            {children}
        </I18nProvider>
    );
}