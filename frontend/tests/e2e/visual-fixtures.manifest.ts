import { pagesManifest, type PageManifestEntry } from "./pages.manifest";

/**
 * VISUAL FIXTURES — the small, hand-picked subset of pages that get pixel-diffed.
 * -----------------------------------------------------------------------------
 * Screenshot count is `fixtures.length x themes x viewports`, and every baseline PNG lives
 * forever in git history. Testing literally every article/case-study would make that number grow
 * unbounded as content is added, for very little payoff: two articles rendered through the same
 * `JournalDetailPage` template don't tell you anything new about "did the template break" that
 * one of them didn't already tell you.
 *
 * So this list is deliberately curated by hand to cover distinct TEMPLATE variants, not content
 * volume:
 *  - static list pages ("/", "/work", "/journal") — always included, they have no variants.
 *  - "/work/navigation-engine" — a case study WITH a `heroImage` reference and an `approach`
 *    steps grid (see WorkCaseStudy in src/data/work.ts).
 *  - "/journal/flowbus" — a journal post whose body includes a `code` block (see
 *    ContentBlock in src/data/journal.ts) alongside plain paragraphs/headings.
 *
 * When the template gains a new visual variant worth guarding (e.g. a case study with no
 * `heroImage`, or a post with an image gallery block), add its path below — do NOT add a flag to
 * `WorkItem`/`JournalPost` for this; those types stay unaware of testing on principle (see
 * VISUAL_TESTING_GUIDE.md, section 4).
 */

const FIXTURE_PATHS: string[] = ["/", "/work", "/work/navigation-engine", "/journal", "/journal/flowbus"];

const pagesByPath = new Map(pagesManifest.map((entry) => [entry.path, entry]));

export const visualFixturesManifest: PageManifestEntry[] = FIXTURE_PATHS.map((path) => {
    const entry = pagesByPath.get(path);
    if (!entry) {
        throw new Error(
            `visual-fixtures.manifest.ts references "${path}", but it no longer exists in ` +
                `pages.manifest.ts. The content behind this fixture was probably renamed, removed, ` +
                `or no longer qualifies (missing caseStudy/body) — update FIXTURE_PATHS above to point ` +
                `at a page that still exists.`,
        );
    }
    return entry;
});
