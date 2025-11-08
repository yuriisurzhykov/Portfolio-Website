type Dict = Record<string, string>;

const locales: Record<string, Dict> = {};
let currentLocaleCode: string = "en";

export function registerLocale(code: string, dict: Dict) {
    locales[code] = dict;
}

export function setLocale(code: string) {
    currentLocaleCode = code;
}

export function ln(i18nKey: string, vars?: Record<string, string | number>) {
    let string = locales[currentLocaleCode]?.[i18nKey] ?? i18nKey;
    if (vars) {
        for (const key in vars) {
            string = string.replaceAll(`{${key}`, String(vars[key]));
        }
    }
    return string;
}

export function getLocale() {
    return currentLocaleCode;
}