import * as fs from "node:fs";
import * as path from "node:path";

/**
 * PAGE MANIFEST — every real, reachable page on the public site.
 * ----------------------------------------------------------------
 * This is the FULL page list, consumed only by `a11y.spec.ts`. Deliberately NOT used by
 * `visual.spec.ts` — screenshot coverage is a separate, hand-curated concern (see
 * `visual-fixtures.manifest.ts`) so that adding the 50th journal post doesn't also add 6 more
 * baseline PNGs to the repo. Accessibility scans are cheap (no stored images, just DOM
 * assertions), so scanning every page here, forever, costs nothing extra as content grows.
 *
 * Unlike its `frontend/tests/` predecessor — which derived this list synchronously from a static
 * `@/data/work` / `@/data/journal` import — this list now comes from Postgres via
 * `@portfolio/backend`, the same service functions the app itself calls. Querying a database is
 * inherently async, and Playwright spec files can't reliably use async data at module-import time
 * (see `generate-pages-manifest.ts`'s own comment for why, with citations). So the actual DB query
 * lives in that sibling script, run once before Playwright starts; this file only reads back the
 * plain JSON it already wrote — a synchronous `fs.readFileSync`, exactly like the original
 * synchronous shape, just backed by a different (pre-computed) source.
 *
 * The `/storybook` route is intentionally excluded — per its own doc comment in
 * `src/app/storybook/page.tsx`, it's a dev-only design-system playground, not part of the public
 * site.
 */
export interface PageManifestEntry {
    /** Stable, filesystem/URL-safe identifier used in test titles and screenshot filenames. */
    name: string;
    /** Route path, relative to the site root, e.g. "/work/navigation-engine". */
    path: string;
}

const MANIFEST_PATH = path.resolve(__dirname, "..", ".generated", "pages-manifest.json");

function readManifest(): PageManifestEntry[] {
    if (!fs.existsSync(MANIFEST_PATH)) {
        throw new Error(
            `${MANIFEST_PATH} doesn't exist yet. Run "npm run test:e2e:generate-manifest" first ` +
                `(the test:e2e / test:visual / test:a11y / test:e2e:update npm scripts already do ` +
                `this for you — only running "npx playwright test" directly skips it). See ` +
                `tests/README.md, section 4.`,
        );
    }
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8")) as PageManifestEntry[];
}

export const pagesManifest: PageManifestEntry[] = readManifest();
