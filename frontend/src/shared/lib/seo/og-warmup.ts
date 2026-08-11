import type { ContentChange, ContentChangeNotifier } from "@portfolio/backend";
import { postOgImagePath, workOgImagePath } from "./og/paths";
import { IS_INDEXABLE, SITE_URL } from "./site-url";

/**
 * Primes `render.tsx`'s `revalidate = 3600` cache for both locales the
 * moment content becomes public, so the FIRST real request — usually a
 * social-media scraper arriving seconds after a link is shared, against its
 * own strict timeout — doesn't pay satori's render+PNG-encode cost on a
 * one-to-two-core VPS. Silent on unpublish/delete (`!change.isPublic`):
 * there is nothing worth pre-rendering for an address that just stopped
 * being public.
 *
 * Deliberately does NOT help the "cold right after a deploy" case — the
 * cache lives in `.next/cache` inside the release directory and is empty on
 * every fresh release regardless of how many posts this notifier ever
 * warmed under the PREVIOUS release. That case is covered separately, by
 * the deploy script's own health check (see `.scripts/deploy-frontend-finish.sh`),
 * which fails the deploy outright rather than warming silently.
 */
export function createOgWarmupNotifier(fetchImpl: typeof fetch = fetch): ContentChangeNotifier {
    return {
        contentChanged(change: ContentChange): void {
            if (!change.isPublic || !SITE_URL) {
                return;
            }
            const pathFor = change.kind === "post" ? postOgImagePath : workOgImagePath;
            for (const locale of change.availableLocales) {
                const url = `${ SITE_URL }${ pathFor(change.slug, locale) }`;
                // No `await`: same "fire-and-forget, never block or fail the
                // caller" contract as ContentChangeNotifier itself documents.
                void fetchImpl(url).catch((error: unknown) => {
                    console.error(`[og-warmup] failed to prime ${ url }.`, error);
                });
            }
        },
    };
}

/**
 * `null` when there is nothing to warm — no public origin configured, or
 * this deployment isn't indexable in the first place (same guard
 * `indexNowNotifierFromEnv` applies, for the same reason: a dev machine has
 * no business priming a cache for a URL nobody will ever crawl).
 */
export function ogWarmupNotifierFromEnv(): ContentChangeNotifier | null {
    if (!IS_INDEXABLE || !SITE_URL) {
        return null;
    }
    return createOgWarmupNotifier();
}
