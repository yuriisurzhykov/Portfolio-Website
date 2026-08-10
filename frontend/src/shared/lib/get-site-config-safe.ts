import { SITE_CONTENT_DEFAULTS, type ConfigContent } from "@portfolio/backend";
import { cachedSiteContent } from "./cached-content";

/**
 * Unlike every `app/**\/page.tsx` (which use `renderOrServiceUnavailable`
 * and show `<ServiceUnavailable/>` for the whole page on a DB outage),
 * `app/(site)/layout.tsx` calls this instead of `getSiteContent("config")`
 * directly — a layout wraps every page under it, including pages that
 * already handle their OWN `DatabaseUnavailableError` gracefully; letting
 * this fetch throw would replace those pages' friendly fallback with
 * Next.js's generic `error.tsx` boundary instead, one level higher than
 * intended. `Nav`/`Footer` are chrome, not primary content — falling back
 * to `SITE_CONTENT_DEFAULTS.config` (the real production identity/contact
 * info as of the last deploy, not placeholder text) on ANY failure here
 * means the header/footer keep working even while the page body they
 * wrap shows `<ServiceUnavailable/>`.
 *
 * `cachedSiteContent`, not `getSiteContent` directly — the landing page
 * reads the same `config` key, so before this the site chrome and the page
 * body under it issued two identical queries on every request to `/`.
 */
export async function getSiteConfigSafe(): Promise<ConfigContent> {
    try {
        return await cachedSiteContent("config");
    } catch {
        return SITE_CONTENT_DEFAULTS.config;
    }
}
