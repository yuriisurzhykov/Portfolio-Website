import { StatusPage } from "@/shared/ui/status-page";

/**
 * Next.js's convention for this route segment — renders whenever
 * `notFound()` is called inside `/`, `/journal(/...)`, `/work(/...)`
 * (see e.g. `journal/[slug]/page.tsx`'s missing-slug check). Sibling to
 * `(site)/error.tsx`, same reasoning: the ancestor layout's Nav/Footer
 * keep rendering around it, since a "page moved" dead end is still part
 * of browsing the public site, not a reason to drop its chrome.
 *
 * The catch-all for a URL matching NO route at all (a typo, not a missing
 * resource inside a route this app owns) falls through to the root
 * `app/not-found.tsx` instead — standalone, matching `/error/[code]`'s
 * own "full-bleed dead end" choice, since an arbitrary mistyped URL has
 * no site section to visually belong to.
 */
export default function SiteNotFound() {
    return <StatusPage code={404} />;
}
