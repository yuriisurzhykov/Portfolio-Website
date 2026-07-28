/**
 * Shared between `proxy.ts` (sets the header, decides the rewrite) and
 * `get-request-locale.ts` (reads the header downstream, in Server
 * Components) — one literal string in one place instead of two files
 * independently agreeing on "x-locale" and "/ru" by convention.
 */
export const LOCALE_HEADER = "x-locale";
export const RU_PREFIX = "/ru";
