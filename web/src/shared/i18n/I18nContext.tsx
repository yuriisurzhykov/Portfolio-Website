"use client";

import React, { createContext, useCallback, useState } from "react";
import type { I18nContextType, Language, LanguageProps, Localized } from "./types";
import { lnFor } from "./engine";

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
 *
 * `ln()` resolves through `lnFor(language, key, vars)` — a pure lookup
 * closed over this provider's own `language` state — instead of the
 * module-level `ln()`/`setLocale()` pair the previous version called.
 * Those mutate one `i18nEngine` instance shared by the whole server
 * process; `changeLanguage` calling `setLocale()` was harmless while it
 * only ever ran client-side (a user clicking the toggle), but Phase 1 of
 * the localized-routing plan needs `<I18nProvider initialLanguage="ru">`
 * to render Russian correctly DURING server-side rendering — and two
 * concurrent requests (one for `/journal/x`, one for `/ru/journal/x`)
 * both mutating that same shared instance across their own `await` points
 * would race. Deriving `ln()` from local `language` state removes the
 * shared mutable state this provider depended on, rather than trying to
 * make the mutation itself concurrency-safe.
 */
export const I18nProvider = ({children, initialLanguage}: LanguageProps) => {
    const [language, setLanguage] = useState<Language>(initialLanguage ?? 'en');

    const ln = useCallback(
        (key: string, vars?: Record<string, string | number>) => lnFor(language, key, vars),
        [language],
    );

    function pick<T>(value: Localized<T>): T {
        // `||`, not `??`: a per-field translation that hasn't been written
        // yet is stored as `ru: ""` (see backend/src/content/localized-text.ts),
        // not `null`/`undefined` — `??` only falls back on nullish, so an
        // empty string would render as blank instead of falling back to
        // English.
        return value[language] || value.en;
    }

    const contextValue: I18nContextType = {
        language: language,
        setLanguage: setLanguage,
        ln,
        pick
    };

    return (
        <I18nContext.Provider value={contextValue}>
            {children}
        </I18nContext.Provider>
    );
}
