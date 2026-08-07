import { z } from "zod";

/**
 * Every scheme this app is willing to render into a live `href`/`src`.
 * `javascript:`/`data:`/`vbscript:` and anything else stay rejected by
 * simply not being on this list — an allow-list, not a denylist, so a
 * scheme nobody has thought of yet is rejected by default instead of
 * silently slipping through.
 */
const ALLOWED_SCHEMES = new Set(["http:", "https:", "mailto:"]);

/**
 * Same "same-origin relative path" shape `frontend/src/shared/lib/
 * safe-relative-path.ts` already uses for post-login redirects — a single
 * leading `/` is safe (this app's own origin), but `//evil.example` is a
 * PROTOCOL-RELATIVE URL (resolves to `https://evil.example` on an https
 * page), not a same-origin path, so it's explicitly excluded.
 */
function isSafeRelativePath(value: string): boolean {
    return value.startsWith("/") && !value.startsWith("//");
}

/**
 * The actual security property this function guarantees: a value that
 * fails this check can never become a live `javascript:`/`data:`
 * `href`/`src` in the public-facing pages that render admin-authored
 * content unsupervised (site config's social links in the footer, a
 * content block's image `src`, an `IconRef`'s `url` variant — see this
 * repo's OWASP audit for why these three specifically needed it). Kept as
 * a plain predicate (not baked directly into a shared Zod schema instance)
 * so callers that need a different Zod error `message` per field can still
 * share the one check.
 */
export function isSafeHref(value: string): boolean {
    if (isSafeRelativePath(value)) {
        return true;
    }
    try {
        return ALLOWED_SCHEMES.has(new URL(value).protocol);
    } catch {
        return false;
    }
}

/**
 * Drop-in replacement for a bare `z.string()` on any field this app later
 * renders into `href`/`src` — see `isSafeHref`'s own comment for exactly
 * what it rejects and why.
 */
export const safeHrefSchema = z.string().refine(isSafeHref, {
    message: "Must be an http(s)/mailto URL or a same-origin relative path (starting with a single \"/\"), not a javascript:/data:/or other scheme.",
});
