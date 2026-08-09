/**
 * Shared between `proxy.ts` (sets the header, decides the rewrite) and
 * `get-request-locale.ts` (reads the header downstream, in Server
 * Components) — one literal string in one place instead of two files
 * independently agreeing on "x-locale" and "/ru" by convention.
 */
export const LOCALE_HEADER = "x-locale";
export const RU_PREFIX = "/ru";

/**
 * Query parameter `proxy.ts` adds to the URL it rewrites `/ru/...` to, and
 * reads back on the second pass over that rewritten URL.
 *
 * The locale has to travel in the URL rather than only in `LOCALE_HEADER`
 * for one reason: a cache keys on the URL. See `handleLocale`'s comment
 * for the cache-poisoning scenario this closes. Prefixed with `__` to
 * signal "internal, not a public query parameter" — no page reads it.
 */
export const LOCALE_PARAM = "__locale";
