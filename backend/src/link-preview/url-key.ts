/**
 * Query parameters that only ever carry campaign tracking, never page
 * identity — two links that differ only in these are the same page, and
 * should share one `LinkPreview` snapshot.
 */
const TRACKING_PARAM = /^(utm_[a-z]+|fbclid|gclid|yclid|mc_cid|mc_eid)$/i;

/**
 * The lookup key a URL's snapshot is stored under (`LinkPreview.urlKey`).
 * `new URL()` already lowercases the scheme/host and drops a default port;
 * on top of that the fragment goes (a `#section` anchor is the same page
 * for preview purposes) and so do tracking params. Returns `null` for
 * anything that isn't an absolute http(s) URL — a relative `/work/...`
 * path is this site's own content and never gets a snapshot.
 */
export function normalizeUrlKey(raw: string): string | null {
    let url: URL;
    try {
        url = new URL(raw.trim());
    } catch {
        return null;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return null;
    }
    url.hash = "";
    for (const name of [...url.searchParams.keys()]) {
        if (TRACKING_PARAM.test(name)) {
            url.searchParams.delete(name);
        }
    }
    return url.toString();
}

/** `github.com`, not `www.github.com` — what a card prints under its title. */
export function displayDomain(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
}
