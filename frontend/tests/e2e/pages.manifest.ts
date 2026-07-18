import { work } from "../../src/data/work";
import { journal } from "../../src/data/journal";

/**
 * PAGE MANIFEST — every real, reachable page on the public site.
 * ----------------------------------------------------------------
 * This is the FULL page list, derived dynamically from the same content data the app itself
 * renders from (`@/data/work`, `@/data/journal`). It is consumed only by `a11y.spec.ts`.
 *
 * Deliberately NOT used by `visual.spec.ts` — screenshot coverage is a separate, hand-curated
 * concern (see `visual-fixtures.manifest.ts`) so that adding the 50th journal post doesn't also
 * add 6 more baseline PNGs to the repo. Accessibility scans are cheap (no stored images, just DOM
 * assertions), so scanning every page here, forever, costs nothing extra as content grows.
 *
 * The `/storybook` route is intentionally excluded — per its own doc comment in
 * `src/app/router/routes.tsx`, it's a dev-only design-system playground, not part of the public
 * site.
 *
 * IMPORTANT: `WorkItem` / `JournalPost` (the domain types in `src/data/*`) know nothing about
 * this file or about testing in general — this module only *reads* them. Do not add
 * testing-related flags to those types; if you need to curate a different subset of pages for a
 * different kind of test, do it here or in a sibling manifest file, not in the domain model.
 */

export interface PageManifestEntry {
    /** Stable, filesystem/URL-safe identifier used in test titles and screenshot filenames. */
    name: string;
    /** Route path, relative to the site root, e.g. "/work/navigation-engine". */
    path: string;
}

const staticPages: PageManifestEntry[] = [
    { name: "home", path: "/" },
    { name: "work-list", path: "/work" },
    { name: "journal-list", path: "/journal" },
];

// Mirrors the guard in WorkDetailPage.tsx: no `caseStudy` means the route just redirects to
// `/work`, so there is no distinct page to test there.
const workDetailPages: PageManifestEntry[] = work
    .filter((item) => Boolean(item.caseStudy))
    .map((item) => ({ name: `work-${item.slug}`, path: `/work/${item.slug}` }));

// Mirrors the guard in JournalDetailPage.tsx: no `body` means the route redirects to `/journal`.
const journalDetailPages: PageManifestEntry[] = journal
    .filter((post) => Boolean(post.body))
    .map((post) => ({ name: `journal-${post.slug}`, path: `/journal/${post.slug}` }));

export const pagesManifest: PageManifestEntry[] = [...staticPages, ...workDetailPages, ...journalDetailPages];
