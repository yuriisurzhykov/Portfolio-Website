import {createContext} from "react";

export type LocalizationContextType = {
    locale: string;
    setLocale: (code: string) => void;
    ln: (key: string, vars?: Record<string, string | number>) => string;
};

export const I18nContext = createContext<LocalizationContextType | undefined>(undefined);