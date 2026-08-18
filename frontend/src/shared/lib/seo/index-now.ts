import type { ContentChange, ContentChangeNotifier } from "@portfolio/backend";
import { indexNowUrlsFor } from "./index-now-urls";
import { IS_INDEXABLE, SITE_URL } from "./site-url";

/** Where the ownership-proof file is served from — see `app/indexnow-key.txt/route.ts`. */
export const INDEX_NOW_KEY_PATH = "/indexnow-key.txt";

const ENDPOINT = "https://api.indexnow.org/IndexNow";

/**
 * How long one URL is silent after being submitted.
 *
 * `updatePost` is called by the admin editor's autosave (3-minute debounce
 * plus a `flush()` on blur), so an hour of editing a live post is roughly
 * twenty calls on one address. The domain is right to report every one of
 * them — how often an event becomes a network request is an infrastructure
 * question, and this is where it gets answered. Bing and Yandex both rate
 * abuse of a key.
 *
 * Accepted limitation: an unpublish landing inside this window after an
 * edit is dropped, and the search engine only learns about the 404 on its
 * own next crawl. Storing the timestamps in process memory (rather than
 * anywhere durable) has the matching, harmless consequence — a restart
 * re-sends a URL once.
 */
const THROTTLE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Fire-and-forget IndexNow adapter — the only thing in the codebase that
 * knows about `/ru`, `SITE_URL`, and IndexNow's HTTP shape.
 *
 * Bing, Yandex, Naver and Seznam learn about a change the same day.
 * Google does not participate at all. For AI search the honest claim is
 * narrower than it looks: ChatGPT's search is hybrid (its own
 * `OAI-SearchBot` index plus Bing's), so this speeds up discovery on one
 * half and guarantees no citation. The necessary condition is the other
 * one — `OAI-SearchBot`, `PerplexityBot` and `Claude-SearchBot` actually
 * getting 200s, which `app/robots.ts` declares and only a live request can
 * prove.
 */
export function createIndexNowNotifier(key: string, fetchImpl: typeof fetch = fetch): ContentChangeNotifier {
    const lastSentAt = new Map<string, number>();

    return {
        contentChanged(change: ContentChange): void {
            const fresh = indexNowUrlsFor(change, SITE_URL).filter((url) => {
                const previous = lastSentAt.get(url);
                return previous === undefined || Date.now() - previous >= THROTTLE_WINDOW_MS;
            });
            if (fresh.length === 0) {
                return;
            }
            for (const url of fresh) {
                lastSentAt.set(url, Date.now());
            }

            // No `await`, and no failure propagated: a search-engine ping
            // has no business failing a publish. Logged rather than
            // silent, though — otherwise the only place this is observable
            // at all is Bing Webmaster Tools, and a key that stopped
            // working would look exactly like a key that works.
            void fetchImpl(ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    host: new URL(SITE_URL).host,
                    key,
                    keyLocation: `${ SITE_URL }${ INDEX_NOW_KEY_PATH }`,
                    urlList: fresh,
                }),
            })
                .then((response) => {
                    if (!response.ok) {
                        console.error(`[indexnow] ${ response.status } for ${ fresh.length } URL(s).`);
                    }
                })
                .catch((error: unknown) => {
                    console.error("[indexnow] submission failed.", error);
                });
        },
    };
}

/**
 * `null` when IndexNow should stay off — no key configured, no site URL,
 * or this deployment isn't indexable in the first place. A dev machine
 * announcing `http://localhost:3000/journal/...` to Bing is exactly the
 * kind of accident `IS_INDEXABLE` exists to prevent.
 */
export function indexNowNotifierFromEnv(): ContentChangeNotifier | null {
    const key = process.env.INDEXNOW_KEY;
    if (!IS_INDEXABLE || !SITE_URL || !key) {
        return null;
    }
    return createIndexNowNotifier(key);
}
