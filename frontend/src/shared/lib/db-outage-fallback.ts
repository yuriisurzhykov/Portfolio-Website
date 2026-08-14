import { isDatabaseUnavailableError } from "@portfolio/backend";

/**
 * Runs `load()`, and degrades to `fallback` ONLY when the database was
 * unreachable. Every other failure propagates.
 *
 * The narrowing is the entire point. A bare `catch` written for a database
 * outage also swallows programmer errors, and the failure mode is silent
 * and long-lived: a `TypeError` while assembling metadata would turn a
 * page `noindex` with nothing in the log and no error page, and a bug in
 * the sitemap's mapping would serve three URLs instead of thirty until
 * someone happened to look. That is strictly worse than crashing.
 *
 * `isDatabaseUnavailableError(error)`, not `error instanceof
 * DatabaseUnavailableError` — see backend/src/errors.ts: `transpilePackages`
 * compiles this package separately per execution context, so `instanceof`
 * fails across the Server-Component/Route-Handler boundary while the
 * name-based check survives it.
 *
 * The expected path is logged too, deliberately. An outage is exactly when
 * a degraded sitemap or a `noindex` page needs to be visible in the
 * journal, rather than inferred weeks later from a coverage graph.
 *
 * Sibling of `render-with-fallback.tsx`'s `renderOrServiceUnavailable`,
 * which applies the identical policy to a page's rendered output; this one
 * is for callers whose fallback isn't React (`Metadata`, a sitemap entry
 * list, an OG-card model).
 */
export async function orDatabaseOutageFallback<T>(
    load: () => Promise<T>,
    fallback: T,
    /** What degraded, in log-readable form — e.g. `"sitemap.xml"` or `"metadata for /journal/my-post"`. */
    context: string,
): Promise<T> {
    try {
        return await load();
    } catch (error) {
        if (!isDatabaseUnavailableError(error)) {
            throw error;
        }
        console.error(`[db-outage] ${ context } — serving the degraded fallback.`, error);
        return fallback;
    }
}
