import {type LocaleStore} from "./LocalStore.ts";
import {LocaleRegistry} from "./LocaleRegistry.ts";
import {WebLocaleStore} from "./impl/WebLocaleStore.ts";

const store: LocaleStore = new WebLocaleStore("/locales", "translation.json");
const registry: LocaleRegistry = new LocaleRegistry(store);

export async function initI18n() {
    await registerLocale("en");
    await registerLocale("ru");
}

export async function registerLocale(code: string) {
    await registry.registerLocale(code);
}

export function setLocale(code: string) {
    registry.setLocale(code);
}

export function ln(i18key: string, vars?: Record<string, string | number>): string {
    return registry.ln(i18key, vars);
}