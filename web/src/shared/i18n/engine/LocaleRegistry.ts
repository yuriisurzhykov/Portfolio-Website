export type Dict = Record<string, string>;

/**
 * Holds every locale's dictionary directly, in memory, from construction —
 * no store abstraction, no async loading. See engine/index.ts's comment
 * for why: the dictionaries are bundled at build time now (statically
 * imported JSON), not fetched over the network at runtime, so there is
 * nothing left to await. `ln()` is correct from the very first render,
 * server or client, which is what actually fixes the flash-of-untranslated-
 * keys bug this replaced — not just a faster fetch, but no fetch at all.
 */
export class LocaleRegistry {
    private readonly locales: Record<string, Dict>;
    private currentLocale: string;

    constructor(locales: Record<string, Dict>, defaultLocale: string) {
        this.locales = locales;
        this.currentLocale = defaultLocale;
    }

    setLocale(code: string): void {
        if (!this.locales[code]) {
            throw new Error(`No locale bundled for code ${code}.`);
        }
        this.currentLocale = code;
    }

    ln(i18key: string, vars?: Record<string, string | number>): string {
        return this.lnFor(this.currentLocale, i18key, vars);
    }

    /**
     * Same lookup as `ln()`, but takes the locale as an explicit argument
     * instead of reading `this.currentLocale` — added for `I18nContext`
     * (see its comment), which needs to resolve a string for whichever
     * locale a given request/render is showing WITHOUT calling
     * `setLocale()` first. `setLocale()`/`currentLocale` mutate one shared
     * instance (`i18nEngine`, constructed once per server process) — safe
     * for a client-only single-user toggle, but calling it during
     * server-side rendering would mean two concurrent requests (one
     * rendering `/journal/x`, one rendering `/ru/journal/x`) mutating and
     * reading the same field, racing across their own `await` points. This
     * method has no shared state to race on at all.
     */
    lnFor(locale: string, i18key: string, vars?: Record<string, string | number>): string {
        let string = this.locales[locale]?.[i18key] ?? i18key;
        if (vars) {
            for (const key in vars) {
                string = string.replaceAll(`{${key}}`, String(vars[key]));
            }
        }
        return string;
    }
}
