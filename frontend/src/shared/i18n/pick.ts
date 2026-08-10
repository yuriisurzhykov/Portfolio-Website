import type { Language, Localized } from "./types";

/**
 * Resolves a `Localized<T>` to one language, falling back to English.
 *
 * Extracted out of `I18nContext.tsx` so it can be used where there is no
 * React context at all — `generateMetadata()` runs before any provider
 * exists, and a `<title>` that ignored the fallback rule would show a raw
 * empty string for every field a translator hasn't filled in yet.
 * `I18nContext.pick` is now a one-line delegate to this, so the rule has
 * exactly one definition.
 */
export function pickFor<T>(value: Localized<T>, language: Language): T {
    // `||`, not `??`: a per-field translation that hasn't been written
    // yet is stored as `ru: ""` (see backend/src/content/localized-text.ts),
    // not `null`/`undefined` — `??` only falls back on nullish, so an
    // empty string would render as blank instead of falling back to
    // English.
    return value[language] || value.en;
}
