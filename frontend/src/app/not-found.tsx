import { StatusPage } from "@/shared/ui/status-page";

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
