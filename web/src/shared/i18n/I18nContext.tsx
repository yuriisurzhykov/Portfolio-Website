"use client";

import React, { createContext, useEffect, useState } from "react";
import type { I18nContextType, Language, LanguageProps, Localized } from "./types";
import { initI18n, ln as lnEngine, setLocale } from "./engine";

export const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({children}: LanguageProps) => {
    const [language, setLanguage] = useState<Language>('en');

    // In the old Vite entry point, `main.tsx` did `await initI18n()` at module
    // scope BEFORE the first `ReactDOM.render` call — so by the time this
    // component ever mounted, both locale dictionaries were already
    // registered and `setLocale('en')` below was safe. Next.js has no
    // equivalent "block rendering until this promise resolves" entry hook for
    // a Client Component, so that ordering guarantee no longer holds; calling
    // `setLocale('en')` without registering the locale first throws
    // ("No locales registered..."). Fixed by having the provider register the
    // locales itself, in order, before switching to one.
    useEffect(() => {
        async function init() {
            await initI18n();
            setLocale('en');
            setLanguage('en');
        }

        void init();
    }, []);

    const changeLanguage = (language: Language) => {
        setLanguage(language);
        setLocale(language);
    };

    function pick<T>(value: Localized<T>): T {
        return value[language] ?? value.en;
    }

    const contextValue: I18nContextType = {
        language: language,
        setLanguage: changeLanguage,
        ln: lnEngine,
        pick
    };

    return (
        <I18nContext.Provider value={contextValue}>
            {children}
        </I18nContext.Provider>
    );
}