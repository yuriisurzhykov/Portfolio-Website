import * as fs from "node:fs";
import * as path from "node:path";
import { config as loadEnv } from "dotenv";

/**
 * GENERATE PAGES MANIFEST — one-off Node script, run BEFORE `playwright test`.
 * -----------------------------------------------------------------------------
 * `frontend/tests/e2e/pages.manifest.ts` (the Vite-SPA version of this file) could build the page
 * list synchronously at module-import time, because its content source was a static in-repo
 * import (`@/data/work`, `@/data/journal`). Here content lives in Postgres, so building the same
 * list means an async DB query — and Playwright test files fundamentally can't do that: Playwright
 * collects tests by requiring each spec file TWICE (a fast synchronous discovery pass, then a real
 * run), and top-level `await` in a spec file only resolves during the second pass, so any `test()`
 * calls that depend on its result silently never get registered during discovery ("No tests
 * found"). Confirmed against real Playwright behavior, not assumed — see the officially
 * recommended workaround this file follows: generate the dynamic data as a separate step BEFORE
 * Playwright starts, write it to a plain JSON file, then have the actual manifest module
 * (`pages.manifest.ts`) read that file back with a synchronous `fs.readFileSync` — see
 * https://github.com/microsoft/playwright/issues/12857 and
 * https://stackoverflow.com/questions/78158808 for the same conclusion from other real projects.
 *
 * Run via the `test:e2e:generate-manifest` npm script, which every other `test:e2e*`/`test:visual`/
 * `test:a11y` script already chains in front of `playwright test` (see package.json) — a developer
 * running `npx playwright test` directly (bypassing npm scripts) needs to run this once first; see
 * tests/README.md section 4.
 *
 * This is also the ONLY file in the whole suite that talks to the database directly. Everything
 * downstream (pages.manifest.ts, visual-fixtures.manifest.ts, the specs) only ever reads the JSON
 * file this script produces.
 */

// `.env.test`, NOT `.env` — deliberately NOT the same file next.config.ts loads for normal local
// dev. This manifest (and the `webServer`-started app under test, see playwright.config.ts) reads
// from `backend/.env.test`'s `portfolio_test` database, seeded with a small, fixed, known set of
// content by `backend/scripts/seed-e2e-fixtures.ts` (run first by every test:e2e*/test:visual/
// test:a11y npm script — see package.json). An earlier version of this suite pointed straight at
// the real dev database instead — that was wrong, not just different: dev content changes
// constantly as the real site evolves, which is exactly the kind of instability a test suite
// should never depend on. See web/tests/README.md's dated correction entry for the full story of
// why that was the wrong call, not just a note that it changed. In CI, DATABASE_URL is already a
// real env var (see backend-web-checks.yml) and dotenv's `config()` never overwrites an existing
// value, so this load is a no-op there — same reasoning as next.config.ts's own call.
loadEnv({ path: path.resolve(__dirname, "..", "..", "..", "backend", ".env.test") });

export interface PageManifestEntry {
    /** Stable, filesystem/URL-safe identifier used in test titles and screenshot filenames. */
    name: string;
    /** Route path, relative to the site root, e.g. "/work/navigation-engine". */
    path: string;
}

const OUTPUT_PATH = path.resolve(__dirname, "..", ".generated", "pages-manifest.json");

async function main(): Promise<void> {
    // A DYNAMIC import here is load-bearing, not a style choice: a static
    // `import ... from "@portfolio/backend"` at the top of this file would have its module graph
    // (backend/src/db/client.ts included) fully evaluated by the JS engine BEFORE this file's own
    // top-level statements run — ES module semantics always finish evaluating static dependencies
    // first, regardless of where the `import` line sits textually. That would construct
    // @portfolio/backend's PrismaClient with `DATABASE_URL` still undefined, since it'd run before
    // the `loadEnv()` call above. A dynamic `import()` defers evaluation to the moment it's
    // actually awaited — i.e. strictly after `loadEnv()` already ran.
    const { getAllWork, getJournalEntries, getPostBySlug } = await import("@portfolio/backend");

    const staticPages: PageManifestEntry[] = [
        { name: "home", path: "/" },
        { name: "work-list", path: "/work" },
        { name: "journal-list", path: "/journal" },
    ];

    const work = await getAllWork();
    // Mirrors the guard in app/(site)/work/[slug]/page.tsx: no case study means the route calls
    // notFound(), so there is no distinct page to test there. `hasCaseStudy` is already a cheap
    // boolean on WorkSummary (see backend/src/content/work.ts) — no extra per-item query needed,
    // unlike the journal posts below.
    const workDetailPages: PageManifestEntry[] = work
        .filter((item) => item.hasCaseStudy)
        .map((item) => ({ name: `work-${item.slug}`, path: `/work/${item.slug}` }));

    const journalEntries = await getJournalEntries();
    // Mirrors the guard in app/(site)/journal/[slug]/page.tsx: no body document means notFound().
    // Unlike WorkSummary, PostSummary has no equivalent "hasBody" flag (see
    // backend/src/content/posts.ts) — so this asks the exact same question the real route asks:
    // getPostBySlug() returns null precisely when there's no body to render (English locale, same
    // as the rest of this suite — see utils/theme.ts's neighbour, no locale switching is tested).
    const journalBodyChecks = await Promise.all(
        journalEntries.map(async (entry) => ({
            entry,
            hasBody: (await getPostBySlug(entry.slug)) !== null,
        })),
    );
    const journalDetailPages: PageManifestEntry[] = journalBodyChecks
        .filter(({ hasBody }) => hasBody)
        .map(({ entry }) => ({ name: `journal-${entry.slug}`, path: `/journal/${entry.slug}` }));

    const manifest: PageManifestEntry[] = [...staticPages, ...workDetailPages, ...journalDetailPages];

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2), "utf-8");

    console.log(`Wrote ${manifest.length} page(s) to ${path.relative(process.cwd(), OUTPUT_PATH)}`);

    // @portfolio/backend doesn't export its PrismaClient (only the service functions/types listed
    // in backend/src/index.ts — see its own module comment on why that boundary is deliberate), so
    // this script has no handle to call `prisma.$disconnect()` the way backend/scripts/*.ts do.
    // The open connection pool would otherwise keep this process alive indefinitely (Node won't
    // exit while sockets are open) — an explicit exit is the correct fix here, not a workaround.
    process.exit(0);
}

main().catch((error: unknown) => {
    console.error("Failed to generate tests/e2e/pages.manifest.ts's data:", error);
    process.exit(1);
});
