import React, { createContext, useEffect, useState } from "react";
import type { I18nContextType, Language, LanguageProps } from "./types.ts";
import { ln as lnEngine, setLocale } from "./engine";

export const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({children}: LanguageProps) => {
    const [language, setLanguage] = useState<Language>('en');

    useEffect(() => {
        async function init() {
            setLocale('en');
            setLanguage('en');
        }

        void init();
    }, []);

    const changeLanguage = (language: Language) => {
        setLanguage(language);
        setLocale(language);
    };

    const contextValue: I18nContextType = {
        language: language,
        setLanguage: changeLanguage,
        ln: lnEngine
    };

    return (
        <I18nContext.Provider value={contextValue}>
            {children}
        </I18nContext.Provider>
    );
}