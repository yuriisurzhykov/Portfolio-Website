import type {Dict, LocaleStore} from "./LocaleStore";

export class LocaleRegistry {

    private localeStore: LocaleStore;
    private currentLocale: string = "";
    private locales: Record<string, Dict> = {};

    constructor(localeStore: LocaleStore) {
        this.localeStore = localeStore;
    }

    async registerLocale(code: string): Promise<void> {
        this.locales[code] = await this.localeStore.loadLocale(code);
        if (!this.currentLocale) {
            this.currentLocale = code;
        }
    }

    setLocale(code: string): void {
        if (!this.locales[code]) {
            throw new Error(`No locales registered with the code ${code}. You must register locale before using it.`)
        }
        this.currentLocale = code;
    }

    ln(i18key: string, vars?: Record<string, string | number>): string {
        let string = this.locales[this.currentLocale]?.[i18key] ?? i18key;
        if (vars) {
            for (const key in vars) {
                string = string.replaceAll(`{${key}}`, String(vars[key]))
            }
        }
        return string;
    }
}