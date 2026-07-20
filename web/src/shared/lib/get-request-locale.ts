import { headers } from "next/headers";
import type { Language } from "@/shared/i18n";
import { LOCALE_HEADER } from "./locale-constants";

/**
 * Reads the locale `proxy.ts` already resolved for this request (rewrite
 * target vs. plain pass-through, see its `handleLocale`) — the one place
 * that turns "whatever's in the `x-locale` header" into the app's actual
 * `Language` type, so every Server Component that needs a locale (the
 * root layout, for `initialLanguage`; `/journal/[slug]` and `/work/[slug]`,
 * for which body Document to fetch) shares one definition of "what counts
 * as a valid value" instead of five ad-hoc `=== "ru" ? "ru" : "en"` checks.
 * `/admin` and `/api` never receive this header at all (see `proxy.ts`),
 * so this defaults to `"en"` there too — correct, since the admin UI is
 * English-only by design.
 */
export async function getRequestLocale(): Promise<Language> {
    const value = (await headers()).get(LOCALE_HEADER);
    return value === "ru" ? "ru" : "en";
}
