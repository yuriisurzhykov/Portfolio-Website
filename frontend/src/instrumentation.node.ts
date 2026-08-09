import { setContentChangeNotifier } from "@portfolio/backend";
import { IS_INDEXABLE, SITE_URL } from "@/shared/lib/seo/site-url";
import { indexNowNotifierFromEnv } from "@/shared/lib/seo/index-now";

/**
 * Everything `register()` does on the Node.js runtime: validate the
 * deployment configuration, then wire the composition root.
 *
 * **`process.exit(1)`, not `throw`.** An exception thrown out of
 * `register()` only brings down `next dev`; under `next start` the server
 * stays up, answers the first request, and then answers nothing ever
 * again. That symptom — "accepts connections, never responds" — is already
 * in this repo's lesson catalogue attributed to a stuck process, so it
 * would have been diagnosed as entirely the wrong thing.
 *
 * **The condition is narrow: only a CONTRADICTION fails.** Claiming to be
 * indexable while pointing at nothing, or at localhost, is not a forgotten
 * variable — it is a half-finished setup that does active damage, since a
 * canonical URL pointing at localhost is worse than no canonical at all.
 * "Nothing configured" is ordinary local development with noindex, and
 * starts normally.
 *
 * Deliberately NOT inside `shared/lib/seo/site-url.ts`: that module is
 * imported by the root layout, the parent of `/admin` and `/storybook`,
 * which are required to run with zero dependency on external state.
 * Throwing at import time there would take the admin panel down to protect
 * a meta tag.
 */
export async function registerNodeInstrumentation(): Promise<void> {
    if (IS_INDEXABLE && !isPublicOrigin(SITE_URL)) {
        console.error(
            `[seo] SEO_INDEXABLE=true requires a public SITE_URL. Got: ${ SITE_URL || "(unset)" }. ` +
            "Refusing to start rather than serving canonical URLs nobody can reach.",
        );
        process.exit(1);
    }

    // Registered once, here. Without it the domain's `ContentChangeNotifier`
    // port stays a no-op, so tests, scripts and any other consumer behave
    // exactly as they did before it existed.
    const notifier = indexNowNotifierFromEnv();
    if (notifier) {
        setContentChangeNotifier(notifier);
    }
}

function isPublicOrigin(siteUrl: string): boolean {
    if (!siteUrl) {
        return false;
    }
    try {
        const { hostname } = new URL(siteUrl);
        return hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "::1";
    } catch {
        return false;
    }
}
