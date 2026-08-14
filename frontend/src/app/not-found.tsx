import { StatusPage } from "@/shared/ui/status-page";
import { NOINDEX } from "@/shared/lib/seo/noindex";

/**
 * Next.js emits its own `<meta name="robots" content="noindex">` on a 404
 * response, and the root layout emits the site-wide permissive one — so
 * without this a missing page shipped two CONTRADICTING directives. Google
 * resolves that by taking the most restrictive, so nothing was actually
 * indexed wrongly, but a page that says both "index" and "noindex" is a
 * question the next reader shouldn't have to answer. Declaring it here
 * makes the two agree.
 */
export const metadata = NOINDEX;

/**
 * Next.js's root-level fallback — catches any URL that doesn't match a
 * route anywhere in the app (the common case: a typo, an old bookmark)
 * as well as a `notFound()` call from a segment with no closer
 * `not-found.tsx` of its own (e.g. the admin edit/translate pages under
 * `app/admin/(dashboard)/**`). Standalone, matching `/error/[code]` —
 * an arbitrary unmatched URL has no site OR admin section to visually
 * belong to, so it gets the same full-bleed treatment rather than
 * borrowing either one's chrome.
 */
export default function NotFound() {
    return <StatusPage code={404} />;
}
