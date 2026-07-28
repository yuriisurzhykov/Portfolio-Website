import { LocaleRegistry } from "./LocaleRegistry";
import en from "../locales/en.json";
import ru from "../locales/ru.json";

/**
 * 2026-07-19 — Replaced a `fetch()`-based store (`WebLocaleStore`, now
 * deleted) that loaded `/locales/{code}/translation.json` over the
 * network from a `useEffect` in I18nContext.tsx. That produced a real,
 * user-visible bug: `ln()` returns the raw key until the fetch resolves,
 * and on a first-ever page load (nothing cached) that's long enough to be
 * clearly visible — every nav label, button, and badge briefly (or not so
 * briefly) shows things like "nav.work" instead of "Work". Two locale
 * JSON files for a two-language personal site don't need a pluggable,
 * async-loading abstraction — they're known at build time, so they're
 * imported directly and bundled into the JS, available synchronously,
 * identically on the server and the client, from the very first render.
 * No fetch, no race, no flash.
 */
export const i18nEngine = new LocaleRegistry({ en, ru }, "en");

export function setLocale(code: string) {
    i18nEngine.setLocale(code);
}

export function ln(i18key: string, vars?: Record<string, string | number>): string {
    return i18nEngine.ln(i18key, vars);
}

/** Stateless variant — see `LocaleRegistry.lnFor`'s comment for why `I18nContext` uses this instead of `ln()`/`setLocale()`. */
export function lnFor(locale: string, i18key: string, vars?: Record<string, string | number>): string {
    return i18nEngine.lnFor(locale, i18key, vars);
}
