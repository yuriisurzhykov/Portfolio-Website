import { type LocaleStore } from "./LocaleStore";
import { LocaleRegistry } from "./LocaleRegistry";
import { WebLocaleStore } from "./impl/WebLocaleStore";

const store: LocaleStore = new WebLocaleStore("/locales", "translation.json");
export const i18nEngine: LocaleRegistry = new LocaleRegistry(store);

export async function initI18n() {
    await i18nEngine.registerLocale("en");
    await i18nEngine.registerLocale("ru");
}

export function setLocale(code: string) {
    i18nEngine.setLocale(code);
}

export function ln(i18key: string, vars?: Record<string, string | number>): string {
    return i18nEngine.ln(i18key, vars);
}