"use client";

import React, { createContext, useState } from "react";
import type { I18nContextType, Language, LanguageProps, Localized } from "./types";
import { ln as lnEngine, setLocale } from "./engine";

export const I18nContext = createContext<I18nContextType | undefined>(undefined);

/**
 * No `useEffect`/`initI18n()` here anymore — `i18nEngine` (engine/index.ts)
 * now constructs itself synchronously, with both dictionaries already
 * bundled, and defaults to "en" the moment the module loads. There's
 * nothing left to wait for: `ln()` is correct on the very first render,
 * server-rendered HTML included, which is what actually fixes the
 * flash-of-untranslated-keys bug an earlier version of this file had (see
 * README.md's journal for the full story — that version's fix was a
 * client-only effect that made the race *shorter*; this removes the race
 * entirely).
 */
export const I18nProvider = ({children}: LanguageProps) => {
    const [language, setLanguage] = useState<Language>('en');

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
