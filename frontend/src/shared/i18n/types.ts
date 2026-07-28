import React from "react";

export type Language = 'en' | 'ru';

export type LanguageProps = {
    children: React.ReactNode;
    /** Server-resolved locale (see `getRequestLocale()`/`proxy.ts`) — the language this tree renders as on its very first paint, server and client alike. Defaults to `"en"` when absent (admin/storybook routes, which never carry a locale). */
    initialLanguage?: Language;
}

/** A piece of content authored once per supported language. */
export type Localized<T = string> = Record<Language, T>;

export interface I18nContextType {
    language: Language;
    setLanguage: (code: Language) => void;
    ln: (key: string, vars?: Record<string, string | number>) => string;
    /** Resolves a `Localized<T>` value to the active language (falls back to English). */
    pick: <T>(value: Localized<T>) => T;
}