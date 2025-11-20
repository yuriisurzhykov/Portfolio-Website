import React from "react";

export type Language = 'en' | 'ru';

export type LanguageProps = {
    children: React.ReactNode;
}

export interface I18nContextType {
    language: Language;
    setLanguage: (code: Language) => void;
    ln: (key: string, vars?: Record<string, string | number>) => string;
}