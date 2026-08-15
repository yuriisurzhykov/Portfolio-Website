# Visual Regression & Accessibility Testing — Personal Guide

> Personal runbook for the screenshot / visual-regression / accessibility suite, ported here from
> `frontend/tests/` (the legacy Vite SPA) once `frontend/` (Next.js + Postgres) became the app that
> actually needs this coverage. Read top-to-bottom the first time, then use as a reference.
> Sections 11 and 12 are living sections — they get updated every time something in this setup
> changes or breaks.

Status legend used below while parts of this guide are still being filled in: `TBD` = not written
yet, will be filled in as the corresponding implementation step lands.

## Table of contents

1. [Overview](#1-overview)
2. [Environment & initial setup](#2-environment--initial-setup)
3. [Environment variables](#3-environment-variables)
4. [Test structure & how to add pages](#4-test-structure--how-to-add-pages)
5. [Running tests locally](#5-running-tests-locally)
6. [Updating baseline screenshots locally](#6-updating-baseline-screenshots-locally)
7. [How this works in CI](#7-how-this-works-in-ci)
8. [Accepting new baselines from a PR](#8-accepting-new-baselines-from-a-pr-update-snapshots)
9. [GitHub Pages](#9-github-pages)
10. [Updating dependencies](#10-updating-dependencies)
11. [Known issues & notes](#11-known-issues--notes)
12. [Implementation log](#12-implementation-log)

---

## 1. Overview

This repo has automated screenshot (visual-regression) and accessibility testing for `frontend/`, the
Next.js app that has replaced the legacy Vite SPA (which used to live at this same `frontend/` path,
before it was retired and this app was renamed into its place) in production. It exists to catch
three kinds of problems before they ship: unintended visual/layout regressions, broken
responsiveness across desktop/tablet/mobile, and accessibility/contrast issues — across both the
light and dark themes.

**Tooling:** [Playwright](https://playwright.dev) (`@playwright/test`) for browser automation and
pixel-diff screenshots, plus [`@axe-core/playwright`](https://github.com/dequelabs/axe-core-npm)
for accessibility scans. Both are free and self-hosted (no third-party SaaS account needed), and
Playwright's built-in `toHaveScreenshot()` stores baseline images as plain PNGs committed directly
in this repo (`frontend/tests/visual-snapshots/`) — that's the "references" folder. Identical tooling
choice to the legacy Vite SPA's `frontend/tests/` — nothing here needed to change to fit Next.js.

**Two complementary visual suites, not one:**

- `visual.spec.ts` — **page-level**: pixel-diffs 5 curated whole PAGES, catching "does the real
  integrated page still look right" (routing, data-fetching, and template all together).
- `component-gallery.spec.ts` — **component-level** (added 2026-08-03, closing out the
  "Storybook-level component isolation" option filed in section 12's 2026-07-27 entry): pixel-diffs
  individual `shared/ui` components in isolation on the `/storybook` playground, catching "did THIS
  component's own appearance change" independent of whether any of the 5 curated pages happen to
  render it in a way that would show the change. See this section's own subsection below for the
  full design.

**Matrix (page-level suite):** every real page × light/dark theme × 3 viewports (Desktop 1440×900,
Tablet 834×1194, Mobile 390×844), all on Chromium. Locale is fixed to `en` (the site's default) to
keep the matrix size reasonable; see section 4 for why *which* pages get pixel-diffed vs. just
accessibility-scanned isn't the same list. The component-level suite uses a narrower matrix — see
below — since it isn't trying to re-prove responsiveness, that's this suite's job already.

**Baselines are accepted from the PR, before merging** — `master` has a repository ruleset that
blocks direct pushes (even from a bot with `contents: write`), so it can't fix its own baselines
after the fact. Instead, when a visual check fails just because the page's own content changed
(new work item, new journal post — not a real bug), commenting `/update-snapshots` on the PR
regenerates and pushes the new baselines straight to that PR's branch, turning the check green
before you merge. See section 8.

**Reports:** Playwright's HTML report (actual/expected/diff view for every failed screenshot) gets
published to GitHub Pages on every run, and a sticky comment on the PR summarizes pass/fail counts
and any accessibility violations found, with a link to the full report (section 7).

**What actually changed porting this from the legacy Vite SPA's `frontend/tests/` to this app's `frontend/tests/` (formerly `web/tests/`, before the later `web/` → `frontend/` rename):** the tests
themselves (`visual.spec.ts`, `a11y.spec.ts`, `utils/theme.ts`, the summary reporter) are
byte-for-byte the same logic — same matrix, same theme-seeding trick, same blocking-impact set.
What had to change is *where the page list comes from*: `frontend/`'s pages were a static in-repo
import (`@/data/work`, `@/data/journal`); `frontend/`'s pages live in Postgres, fetched through
`@portfolio/backend`. That's a fundamentally different (async) data-access shape, and it's the
reason this port needed a new file (`generate-pages-manifest.ts`) that didn't exist before — see
section 4 for the full story, including the Playwright limitation that forced this design.

**Corrected after the first version shipped — see section 12's 2026-07-27 "correction" entry
before assuming this suite talks to a live database.** The very first working version of this
port queried the real dev database directly. That was wrong, not just a later style preference:
dev content changes constantly as the actual site evolves (new work items, new posts), which
makes a "regression" suite's results depend on whatever happened to exist at the moment someone
ran it — exactly the kind of instability a test suite exists to eliminate, not introduce. Caught
by the user, who asked to be consulted on the data-strategy decision *before* it was implemented,
not after. Four real 2026-era approaches to this problem were discussed (seeded test database,
fake in-memory backend swapped in at build time, MSW + Next's `testProxy`, Storybook-level
component isolation) — this suite ended up on the first one; the other three are recorded as
deliberate backlog, not rejected outright, in section 12.

**Why this document exists:** it's the single place documenting every decision made while
building and then porting this — including two color-token fixes that were tried and rejected
before landing on the final approach, and a real Playwright limitation hit while porting the page
manifest to a database-backed source (both in section 11) — so that six months from now, "why is
this token named like this" and "why does this file exist" both have answers here instead of
having to be reverse-engineered from git history.

## 2. Environment & initial setup

### Requirements

- Node.js 20+ (`backend-web-checks.yml`, the CI workflow covering `frontend/`, pins **Node 22** because
  `@stryker-mutator/vitest-runner` needs it — this suite doesn't have its own separate Node
  requirement, it just rides along with whatever `frontend/`'s other CI already uses). Locally this was
  developed against Node 22.22.0/24.x, which also works fine — the app has no Node-version-specific
  code.
- npm (comes with Node). This repo uses `npm ci`/`package-lock.json` at the workspace root, not
  yarn/pnpm.
- A running Postgres, with `backend/.env.test`'s `portfolio_test` database migrated (`cd backend
  && npm run test:migrate`) — see section 3. Unlike `frontend/`'s version of this suite, which
  needed zero external services, this one's page list is generated FROM the database (section 4).
  **Deliberately NOT the dev database** (`backend/.env`'s `portfolio`) — see this document's
  intro and section 12's 2026-07-27 entry for why an earlier version of this port got that wrong.

### First-time setup

```bash
# from the repo root — frontend/ and backend/ are npm workspace members, installed together
npm install
cd web
npx playwright install chromium       # downloads the Chromium browser binary Playwright drives

# One-time (or after schema changes): make sure the TEST database (not dev) has the current schema
cd ../backend
npm run test:migrate
```

`npx playwright install` downloads browser binaries into a local cache
(`~/.cache/ms-playwright` on Linux/macOS, `%USERPROFILE%\AppData\Local\ms-playwright` on Windows —
that's `C:\Users\<you>\AppData\Local\ms-playwright` specifically). This cache is **not** part of
the repo and is not committed; every fresh machine (including CI runners) has to run the install
command once. In CI we additionally pass `--with-deps` (`npx playwright install --with-deps
chromium`) which, on the Ubuntu runner, also installs the OS-level shared libraries Chromium needs
to launch headless — this flag only does something on Linux; on Windows/macOS it's a no-op because
those OS's usually already have what's needed.

Only **Chromium** is installed/used for now (not Firefox/WebKit) to keep CI time and image size
down — the whole point of this suite is catching CSS/layout/contrast regressions, and Chromium
alone catches the overwhelming majority of those for a Tailwind-based site. Multi-browser can be
added later by adding more entries to the `projects` array in `playwright.config.ts` and running
`npx playwright install <browser>`.

### Windows (local) vs Linux (CI) — why it matters for screenshots

Playwright screenshots are pixel comparisons. Font rendering (anti-aliasing, hinting, sub-pixel
rendering) genuinely differs between Windows and Linux, even with an identical browser version and
identical CSS. This means: **a screenshot baseline generated on your Windows machine will very
likely NOT match pixel-for-pixel with the same page rendered on the Ubuntu GitHub Actions runner**,
even when nothing about the page actually changed. This is the single biggest practical gotcha of
this whole setup — unchanged from the `frontend/tests/` original.

The resolution: **baselines are always generated by CI (Ubuntu/Linux), never by a manual local
run on Windows.** See [section 6](#6-updating-baseline-screenshots-locally) for how to reproduce
the CI environment locally via Docker if you need to debug a diff without pushing.

**Rendered markup/CSS differs enough from the old Vite app that pixel baselines had to be
regenerated fresh, not copied over from `frontend/tests/visual-snapshots/`** — Next.js's SSR HTML
and the exact same Tailwind build don't byte-match the old Vite output closely enough for a
pixel-diff tool to treat them as "the same page." No baselines are committed as part of this port;
the first real CI run against a seeded database produces them, same mechanism as section 6/12.

## 3. Environment variables

**Nothing new is required beyond what `backend/`'s own test suite already needs.**
`playwright.config.ts` loads `backend/.env.test` itself (note: **`.env.test`, not `.env`** — see
this document's intro) so `DATABASE_URL` (pointing at `portfolio_test`) is available to
`generate-pages-manifest.ts` and to the `webServer`-started Next.js app without any
suite-specific setup beyond what `backend/README.md` already documents for `npm test`. Normal
local runs need `backend/.env.test` to exist (copy from `.env.test.example`) and `portfolio_test`
to be migrated — `frontend/`'s version of this suite never had this requirement at all, since its
page list came from a static import with zero database dependency.

One optional variable, for a specific edge case: `PLAYWRIGHT_BASE_URL`. Set it only if you want to
point the suite at an already-deployed URL (e.g. a staging deployment) instead of building and
starting the Next.js app locally:

```bash
# frontend/.env.test (copy from .env.test.example — gitignored, never commit your own)
PLAYWRIGHT_BASE_URL=https://staging.example.com
```

When set, `playwright.config.ts` uses it as `baseURL` directly and skips starting the local
`webServer` entirely (no point building the app locally if you're testing a deployed instance).
Unset (the default) it falls back to `http://localhost:3100`.

**Two variables added 2026-08-08 for `seo.spec.ts`, in `backend/.env.test`:**

```bash
SEO_INDEXABLE="true"
SITE_URL="https://e2e.example.com"
```

Indexing is opt-in (`frontend/src/shared/lib/seo/site-url.ts`), so without these the
`webServer`-started app serves the **noindex** variant of the site — that is, the one that never
runs in production, leaving the branch that does run covered by no test at all. The host is
fictional on purpose: it only has to look public, since `frontend/src/instrumentation.node.ts`
refuses to start on `SEO_INDEXABLE=true` combined with a localhost `SITE_URL`. In CI the same
two are job-level `env` in `visual-tests.yml` and `accept-visual-baselines.yml` (they must match
each other — baselines regenerated against the noindex build would then fail the real check).

No other `.env` files exist or are needed anywhere else in this repo for this feature.

## 4. Test structure & how to add pages

```
frontend/
  playwright.config.ts
  tests/
    README.md                       # this file
    tsconfig.json                   # own small TS project — see its own comment for why
    .generated/                     # gitignored — generate-pages-manifest.ts's JSON output
      pages-manifest.json
    e2e/
      generate-pages-manifest.ts    # THE ONLY file here that talks to the database (portfolio_test, never dev)
      pages.manifest.ts             # sync reader of .generated/pages-manifest.json, used by a11y.spec.ts
      visual-fixtures.manifest.ts   # static — curated subset, used by visual.spec.ts only
      component-gallery.manifest.ts # static — curated shared/ui components, used by component-gallery.spec.ts only
      utils/theme.ts                # seedTheme(page, "light" | "dark")
      visual.spec.ts
      component-gallery.spec.ts
      a11y.spec.ts
      seo.spec.ts                   # no baselines — asserts on served HTML/robots.txt/sitemap.xml
      og-image.spec.ts              # baselines of the OG image ROUTES' output (see section 4)
      reporters/summary-reporter.ts
    visual-snapshots/               # committed baseline PNGs (the "references" folder)
      home/
        light-Desktop.png
        dark-Desktop.png
        light-Tablet.png
        dark-Tablet.png
        light-Mobile.png
        dark-Mobile.png
      work-list/            (same 6 files)
      work-navigation-engine/
      journal-list/
      journal-flowbus/
      components/                  # component-gallery.spec.ts's baselines — one subfolder per component
        button/
          light-Desktop.png
          dark-Desktop.png
        card/                (same 2 files)
        ...                  (one folder per frontend/tests/e2e/component-gallery.manifest.ts entry)
      og-default/                  # og-image.spec.ts's baselines — one file each, Desktop only
        desktop.png
      og-journal-en/               (same 1 file)
      og-journal-ru/
      og-work-ru/
```

One folder per page (5 folders × 6 files = 30), rather than 30 flat files — much easier to review
"everything about the page this PR touched" at a glance. This comes from passing an **array** as
the name to `toHaveScreenshot()` in `visual.spec.ts` (`[entry.name, \`${theme}.png\`]`) — Playwright
treats array elements as nested path segments, so combined with `snapshotPathTemplate` in
`playwright.config.ts` (`{snapshotDir}/{arg}-{projectName}{ext}`), the viewport (`{projectName}`)
still ends up in the filename while the page name becomes the folder.

### Why a `generate-pages-manifest.ts` script exists at all (the actual porting problem)

`frontend/tests/e2e/pages.manifest.ts` could build the page list with a plain, synchronous
`export const pagesManifest = [...]`, because its data source (`@/data/work`, `@/data/journal`)
was a static in-repo import — no I/O, so no `async` needed anywhere.

`frontend/`'s content lives in Postgres. Building the equivalent list means calling `getAllWork()` /
`getJournalEntries()` (from `@portfolio/backend`, the same package the app itself uses) — which are
inherently `async`. The first draft of this port tried to just make `pages.manifest.ts` itself
`async` and `await` it from the top of `visual.spec.ts`/`a11y.spec.ts`. **This does not work**:
Playwright discovers tests by requiring every spec file **twice** — once synchronously, purely to
enumerate `test()` calls, and again for the actual run. A top-level `await` in a spec file only
resolves during the second pass; during the fast discovery pass, any `test()` calls gated behind
it simply never register, and Playwright reports "No tests found." This isn't a guess — it's
confirmed against real reports from other projects hitting the exact same wall (see section 11 for
the citations), and it's also *why* Playwright's own docs recommend generating dynamic test data
in a separate step and reading it back synchronously, rather than trying to `await` it inline.

The fix that's actually in place: `generate-pages-manifest.ts` is a plain Node script (not a
Playwright file at all — run via `tsx`, before Playwright ever starts) that does the real
`getAllWork()`/`getJournalEntries()` calls and writes a plain JSON file
(`tests/.generated/pages-manifest.json`, gitignored). `pages.manifest.ts` goes back to being
exactly what it was in `frontend/tests/` — a synchronous module, just reading that JSON with
`fs.readFileSync` instead of importing static data. Every `npm run test:e2e`/`test:visual`/
`test:a11y`/`test:e2e:update` script in `package.json` runs `test:e2e:prepare` first
(`test:e2e:prepare && playwright test ...`, itself `test:e2e:seed-fixtures &&
test:e2e:generate-manifest` — see below) — running `npx playwright test` directly, bypassing npm
scripts, skips this and fails with a clear, actionable error from `pages.manifest.ts` telling you
to run the prepare step first.

### Where the data itself comes from — a seeded test database, NOT the dev database

`generate-pages-manifest.ts` and the `webServer`-started Next.js app both read from
`backend/.env.test`'s `portfolio_test` database — **never** `backend/.env`'s real dev database.
This wasn't the original design (see this document's intro and section 12's 2026-07-27 entry) —
the first working version of this port queried the dev database directly, which is exactly the
"constantly changing data" problem a regression suite exists to eliminate, not depend on: a new
work item or post added through the admin panel would silently change what pages exist and what
they render, making yesterday's passing run and today's a comparison between two different sites,
not evidence of a real regression either way.

The fix: `test:e2e:seed-fixtures` (`npm --prefix ../backend run seed-e2e-fixtures`, which runs
`backend/scripts/seed-e2e-fixtures.ts` against `.env.test`) hard-resets `portfolio_test` and
inserts a small, fixed, deliberately-curated set of content — 3 work items (2 with a case study,
1 without) and 3 posts (2 with a body, 1 "upcoming" stub without) — via the SAME `createWork`/
`createPost` functions the admin panel's own API routes call, not raw `prisma.*.create()` calls
(so `Document`/`Block` creation for case studies/bodies is never duplicated logic). Every
`test:e2e*`/`test:visual`/`test:a11y` npm script runs this before `generate-pages-manifest.ts`, so
the manifest and the actual server under test always agree on exactly the same 7 real pages —
listed and reasoned about in `backend/scripts/seed-e2e-fixtures.ts`'s own doc comment, not
duplicated here. See `backend/scripts/README.md` for the seed script's own dated entry.

**Two separate manifests, on purpose, same reasoning as `frontend/tests/`:** `pages.manifest.ts`
is the *dynamic, full* list — one entry per page that actually renders (every work item with
`hasCaseStudy: true`, every journal post with a real body document), plus 3 hardcoded static
routes (`/`, `/work`, `/journal`). `visual-fixtures.manifest.ts` is *static* — the same
hand-picked 5-route list `frontend/tests/` used (routes are identical between the two apps), and
it validates every path it lists still exists in `pages.manifest.ts` at import time, throwing a
clear error otherwise (e.g. if a case study's slug changes, or the database the manifest was
generated against doesn't have that content seeded yet).

**Why the split:** accessibility scans are cheap (no images stored, just DOM assertions) so
`pages.manifest.ts` can safely scale to hundreds of future articles/projects with zero added
cost. Screenshots are not cheap (every new page × 2 themes × 3 viewports = 6 new baseline PNGs,
forever, in git history) — testing every single future article visually would provide near-zero
extra signal (it's the same shared page template being re-tested) while bloating the repo. So
visual regression stays pinned to a small, deliberately curated set. See section 11 for why
*masking* the dynamic content areas of `home`/`work-list`/`journal-list` was considered as an
alternative in the original `frontend/tests/` implementation and dropped in favor of the
`/update-snapshots` mechanism (section 8) — that decision carries over unchanged.

Neither manifest adds anything to `@portfolio/backend`'s domain types (`WorkSummary`/
`PostSummary`) — they have zero knowledge that tests exist, same separation of concerns the
original `frontend/tests/` established with `WorkItem`/`JournalPost`. If you need a different
subset of pages for some future test type, create another manifest file, don't add a flag to the
domain model.

### Component-level snapshots (`component-gallery.spec.ts`)

Unlike the page-level suite, this one doesn't need the database or a generated manifest at all —
it screenshots individual `shared/ui` components rendered on the existing, public `/storybook`
playground (`frontend/src/views/storybook/Storybook.tsx` +
`frontend/src/feature/design-system/DesignSystemPlayground.tsx`), which already existed as a
dev-only design-system showcase before this suite used it for anything.

**The contract: `data-component-id`.** Every component demoed on that page sits inside a
`<section data-component-id="<slug>">`. `component-gallery.manifest.ts` is a static
`{ id, label }[]` array — same shape and same "hand-curated, not auto-discovered" philosophy as
`visual-fixtures.manifest.ts` — that the spec iterates over to build one screenshot test per
component × theme. The `id` is what ties a manifest entry to its live DOM element; it's
deliberately decoupled from the section's visible heading text, so a copy change (renaming
"ProgressBar" to something friendlier, say) never silently breaks a screenshot's identity.

**Why hand-curated instead of just screenshotting every `<section>` found on the page:** same
reasoning `visual-fixtures.manifest.ts` already gives for pages — explicit control over what's
covered, and a clear place to explain *why* something is or isn't included (see the manifest
file's own doc comment for the current exclusion list: admin-only/interactive components, and
`Diagram`'s PlantUML engine specifically).

**The staleness guard.** A hand-curated list drifting out of sync with the actual page is a real
risk (forget to update the manifest after adding/removing a demo section — miscoverage either
way, silently). `visual-fixtures.manifest.ts` solves this for pages by validating at *import time*
(it throws if a path doesn't exist in the dynamic manifest). Components aren't loaded from a
generated JSON file, so there's nothing to validate against at import time — instead,
`component-gallery.spec.ts`'s first test navigates to `/storybook` once and asserts the exact set
of `[data-component-id]` elements on the live page equals the manifest's `id` set. Add a demo
section without a matching manifest entry (or vice versa) and this test fails loudly, immediately,
instead of the gallery silently under- or over-covering the design system.

**Matrix:** every manifest entry × light/dark theme, Desktop viewport only — deliberately narrower
than the page-level suite's 3-viewport matrix. Component-level snapshots aren't trying to re-prove
responsiveness (that's `visual.spec.ts`'s job on the 5 real pages); testing every atom at 3
viewports would just be paying baseline-count cost for signal this suite already gets elsewhere.
This falls out of `playwright.config.ts`'s existing project setup for free: the Tablet/Mobile
projects already restrict to `testMatch: /visual\.spec\.ts/`, a regex `component-gallery.spec.ts`'s
filename never matches — no config change was needed to get Desktop-only behavior.

**Why PlantUML diagrams aren't demoed.** `Diagram`'s `mermaid` engine renders fully client-side —
deterministic, no network call, safe to screenshot. Its `plantuml` engine fetches from a
self-hosted `plantuml-server` via `/api/diagrams/plantuml/[encoded]`
(`PLANTUML_SERVER_URL`, defaulting to `http://127.0.0.1:8081` — see that route's own comment),
which nothing in this suite's `webServer` or CI job starts. Demoing it here would either always
render the component's own error-fallback state (useless as a baseline) or require standing up a
whole extra service just for this suite. Worth noting: the seed fixtures (`seed-e2e-fixtures.ts`)
don't include a `diagram`-type block either, so this was already an *undocumented* gap in
diagram-rendering coverage before this suite existed — not something this suite introduces, and it
at least newly covers the Mermaid half of it.

**How to add a new component to coverage:**

1. Add a demo `<section data-component-id="your-slug">` to `DesignSystemPlayground.tsx` (or
   `Storybook.tsx`, for anything that doesn't fit the playground's layout) with fixed, deterministic
   props — no random data, no relative timestamps, nothing that would make two runs of the same
   code produce different pixels.
2. Add `{ id: "your-slug", label: "YourComponent" }` to `component-gallery.manifest.ts`.
3. Run `npm run test:e2e:update:components` (or comment `/update-snapshots` on the PR — section 8 —
   which now regenerates both suites together) to generate its first baseline.

### SEO assertions (`seo.spec.ts`) and OG-image baselines (`og-image.spec.ts`)

Added 2026-08-08 alongside the SEO layer (`frontend/src/shared/lib/seo/README.md` has the full
design). Two specs, deliberately separate from everything above.

**`seo.spec.ts` stores no images.** It asserts on what a crawler actually receives: two different
posts have two different `<title>`s and `description`s, `canonical` is present and absolute,
hreflang covers exactly the locales the content really has, JSON-LD parses and its `author`
resolves to a `Person` node in the same document, `/robots.txt` and `/sitemap.xml` answer 200,
and `/error/429` and `/storybook` carry `noindex`. It also cross-checks the URL set in
`/sitemap.xml` against `pages.manifest.ts` — the same trick `component-gallery.spec.ts` uses on
its manifest, for the same reason: the static-route list exists twice in the repo (in
`app/sitemap.ts` and in `generate-pages-manifest.ts`'s `staticPages`) and can't be shared
directly, because the second lives in a script that writes JSON before Playwright starts. Both
apply identical `hasBody`/`hasCaseStudy` guards, so the two sets must match exactly — a new
public page forgotten in the sitemap turns a red build instead of quietly not being indexed.

**This spec needs `SEO_INDEXABLE=true` and a public-looking `SITE_URL`** (see section 3).
Without them the app under test is the noindex variant, which is precisely the one that never
runs in production — the branch that does run would be covered by nothing. The first test fails
loudly on a bare `Disallow: /` rather than asserting against the wrong build.

**`og-image.spec.ts` screenshots the ROUTE's output, not the template rendered as a component**,
and that distinction is the whole point. satori (behind `next/og`) has no system fonts at all:
everything it draws comes from the TTF buffers `shared/lib/seo/og/fonts.ts` hands it. A browser
silently falls back to a system font and draws Cyrillic correctly — so a component-level
screenshot of the same template would stay green with a completely broken font subset, while the
real card came out as "tofu". Three of the four baselines are Russian for exactly this reason;
`flowbus` and `navigation-engine` are the two translated fixtures.

Desktop only, one baseline per route — an OG image has no theme, so there are four baselines
here rather than eight. This falls out of `playwright.config.ts`'s existing projects for free,
the same way `component-gallery.spec.ts` does. Baselines are accepted through
`/update-snapshots` like every other one (`test:e2e:update:all` now includes this spec); never
generate them on Windows — font rendering differs between platforms (section 2).

### How to add pages

- **New fixture journal post or work item, for template-variant coverage:** add it to
  `backend/scripts/seed-e2e-fixtures.ts`'s `FIXTURES` object (via `createWork`/`createPost`, same
  as the existing entries) — NOT through the admin panel, and NOT against `backend/.env`'s dev
  database (see the section above for why). The next `npm run test:e2e`/`test:a11y`/etc. reseeds
  `portfolio_test` and regenerates the manifest, picking the new fixture up automatically —
  accessibility coverage with zero test-code changes beyond the fixture itself. It will NOT
  automatically get visual-regression coverage (see above) — that's deliberate. If the visual
  check on `home`/`work-list`/`journal-list` fails just because your new content changed what they
  render, that's expected — see section 8 to accept it.
- **You want this specific new page visually regression-tested too** (e.g. it uses a new content
  block type, or a layout variant nothing else has): add its path to the `FIXTURE_PATHS` array at
  the top of `tests/e2e/visual-fixtures.manifest.ts`.
- **A brand-new top-level route** (e.g. a future `/about`): add one line to the `staticPages`
  array in `tests/e2e/generate-pages-manifest.ts` (NOT `pages.manifest.ts` — that file just reads
  the JSON the generator writes). If you also want it visually tested, add it to
  `visual-fixtures.manifest.ts` too.
- **A fixture's underlying content gets renamed/removed:** `visual-fixtures.manifest.ts` throws a
  descriptive error at test-collection time (`npx playwright test --list` will fail loudly, after
  you've run the generator at least once) rather than silently dropping that page from coverage —
  update `FIXTURE_PATHS` to point at something that still exists.

## 5. Running tests locally

```bash
cd web

npm run test:e2e              # seeds fixtures + generates the manifest, then runs everything (visual + components + a11y, all projects)
npm run test:visual           # seeds fixtures + generates the manifest, then runs only tests/e2e/visual.spec.ts
npm run test:visual:components # seeds fixtures + generates the manifest, then runs only tests/e2e/component-gallery.spec.ts
npm run test:a11y             # seeds fixtures + generates the manifest, then runs only tests/e2e/a11y.spec.ts

npx playwright test --project=Desktop         # only the Desktop viewport project
npx playwright test -g "home @ light"         # only tests whose title matches this string

npx playwright test --headed                  # watch the browser while it runs
npx playwright test --debug                   # step through with the Playwright Inspector
npx playwright test --ui                      # interactive UI mode (recommended for exploring)

npm run test:e2e:report       # opens the last HTML report (or: npx playwright show-report)
```

Running `npx playwright test ...` directly (any of the three commands above) skips both the
fixture-seeding and manifest-generation steps — only safe if you already ran `npm run
test:e2e:prepare` (or one of the `npm run test:*` scripts) at least once. Otherwise
`pages.manifest.ts` throws a clear error telling you to run it.

`--list` (e.g. `npx playwright test --list`) is useful to sanity-check the manifest/fixture logic
without launching a single browser — it prints every resolved test title, and importantly, it's
also what will surface a `visual-fixtures.manifest.ts` "stale fixture" error immediately, since
that check runs at module-import time (after the JSON manifest has already been generated once).

## 6. Updating baseline screenshots locally

```bash
npm run test:e2e:update
# equivalent to: npm run test:e2e:prepare && playwright test tests/e2e/visual.spec.ts --update-snapshots
# (page-level baselines only)

npm run test:e2e:update:components
# equivalent to: npm run test:e2e:prepare && playwright test tests/e2e/component-gallery.spec.ts --update-snapshots
# (component-level baselines only)

npm run test:e2e:update:all
# both of the above together, in one Playwright invocation — what /update-snapshots (section 8) runs
```

**Don't commit baselines generated this way on Windows.** As covered in section 2, Windows and
Linux render text with different anti-aliasing, so a Windows-generated baseline will show as a
false diff the moment CI (Ubuntu) runs against it. Three options, in order of preference:

1. **Comment `/update-snapshots` on the PR** (recommended, no local setup at all — see section 8).
2. **Just push to a PR branch and look at the CI-run report** (no local baseline update needed
   either — the PR job's HTML report shows you exactly what changed, actual/expected/diff, side
   by side).
3. **Reproduce the CI environment locally via Docker**, if you specifically want to iterate on a
   diff without pushing anything yet. This needs a reachable Postgres from inside the container
   too (`--network host` on Linux, or point `DATABASE_URL` at a host that's reachable from
   Docker's network on Windows/macOS) — and, same as any local run, `backend/.env.test`'s
   `portfolio_test` database, migrated, never the dev one:

   ```bash
   docker run --rm -v "${PWD}:/work" -w /work/web \
     mcr.microsoft.com/playwright:v1.61.1-noble \
     bash -c "npm run test:e2e:prepare && npx playwright test tests/e2e/visual.spec.ts --update-snapshots"
   ```

   (Swap `tests/e2e/visual.spec.ts` for `tests/e2e/component-gallery.spec.ts`, or drop the path
   argument entirely, to regenerate the component-level or both suites' baselines the same way.)

   (Match the image tag's Playwright version to `frontend/package.json`'s `@playwright/test` version
   whenever you bump it — see section 10.) This runs the exact same Ubuntu/Chromium combination
   the GitHub Actions runner uses, so the resulting PNGs are safe to commit directly.

## 7. How this works in CI

Workflow file: [`.github/workflows/visual-tests.yml`](../../.github/workflows/visual-tests.yml).
One job, `test`, runs the exact same way on both triggers — **always compare-only, never
`--update-snapshots`** (that only ever happens via the `/update-snapshots` PR-comment workflow,
section 8):

- **`pull_request`** (opened/synchronize/reopened, any branch): compares against whatever is
  currently committed in `tests/visual-snapshots/`. If any screenshot differs or any
  accessibility check finds a `critical`/`serious` violation, this step (and therefore the whole
  job/PR check) fails — that's the intended "red X" signal for the reviewer.
- **`push` to `master`**: runs the identical check. Since a PR's baselines should already be
  correct by the time it's merged (you accepted them via `/update-snapshots` before merging, if
  needed), this run is a confirmation, not a place that fixes anything — `master` has a
  repository ruleset blocking direct pushes anyway, so this job never tries to commit here (see
  section 8 for why that matters).

Unlike `frontend/tests/`'s version of this workflow, the job now also runs an ephemeral
`postgres:16-alpine` service container (same image/settings as `backend-web-checks.yml`'s own job,
kept in sync deliberately), with `DATABASE_URL`/`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` set as
real job-level env vars — not a `backend/.env.test` file, which doesn't exist in CI. A dedicated
"Apply migrations to the CI database" step runs `npx prisma migrate deploy` in `backend/` before
Playwright starts, then the "Run tests" step's `npm run test:e2e` reseeds `portfolio_test` and
regenerates the manifest against that same database (section 4) before running the suite. Also
unlike the legacy Vite SPA's `frontend/tests/`, dependencies are installed once at the **repo root** (`npm ci`, no
`working-directory`), since `frontend`/`backend` are npm workspace members sharing one root
`package-lock.json` — the legacy Vite SPA had its own standalone lockfile and could install in place.

Regardless of outcome, the job always (`if: always()`) goes on to: publish the HTML report to
GitHub Pages (section 9), and — on PRs — post/update a sticky summary comment built by
[`.github/scripts/format-summary.mjs`](../../.github/scripts/format-summary.mjs) from
`frontend/test-results/summary.json` (the file our custom `summary-reporter.ts` writes).

Where to look:

- **PR check status** — the "Visual & Accessibility Tests" check on the PR itself.
- **PR comment** — a single sticky comment (edited in place on every push, not duplicated) with
  pass/fail counts and any accessibility violations found, plus a link to the full report.
- **Full report** — `https://<owner>.github.io/<repo>/reports/pr-<number>/` for a PR run, or
  `https://<owner>.github.io/<repo>/reports/master/` for the latest master run. This is
  Playwright's own HTML report — click into any failed visual test to see actual/expected/diff
  images side by side.

## 8. Accepting new baselines from a PR (`/update-snapshots`)

Workflow file:
[`.github/workflows/accept-visual-baselines.yml`](../../.github/workflows/accept-visual-baselines.yml).

**Why this exists instead of a master auto-commit:** the original `frontend/tests/` design
regenerated baselines on `master` after merge and committed them directly. That doesn't work here
— `master` has a repository ruleset (PR required, status checks required, CodeQL required) that
blocks direct pushes, including from a bot with `contents: write`. The fix isn't to bypass that
(e.g. via a PAT in the ruleset's allow-list — see the `[RESOLVED]` note in section 11 for the
workaround that was tried first and abandoned) — it's to never need to push to `master` at all:
baselines get accepted **before** merging, from the PR's own branch, which has no such
restriction.

**How to use it:** when a visual check fails and the report shows the diff is just your own
content change (not a real bug), comment exactly:

```
/update-snapshots
```

on the PR. The bot reacts with 👍, then:

1. A separate `guard` job verifies the comment author and that the PR's branch actually lives in
   this repository (not a fork), capturing an immutable commit SHA in that same API call.
2. A second `update-snapshots` job, gated on `guard`'s output, checks out **that exact SHA** (not a
   mutable branch ref — see the workflow file's own top comment for why this is split into two
   jobs instead of one).
3. Regenerates `tests/visual-snapshots/` (`npm run test:e2e:prepare && npx playwright
   test tests/e2e/visual.spec.ts --update-snapshots`) in the same Ubuntu/Chromium environment CI
   uses — no local Docker step needed. Needs the CI Postgres service container reachable, same as
   the main check (section 7).
4. Commits and pushes straight to that branch if anything actually changed.
5. Posts a follow-up comment: ✅ if it pushed an update, ℹ️ if there was nothing to update, ❌ with
   a link to the run if something went wrong.

That push automatically re-triggers the normal `pull_request: synchronize` event, so
`visual-tests.yml` re-runs and the check turns green on its own — no need to re-run anything by
hand, and no second build on `master` either, since the PR's branch already has the correct
baselines by the time you merge.

**Restricted to trusted commenters — but that alone is not enough:**
`github.event.comment.author_association` (`OWNER`/`MEMBER`/`COLLABORATOR`) vets *who posted the
comment*, not *whose code is about to run*. That distinction matters: without a second check, a
trusted maintainer commenting `/update-snapshots` on a malicious fork PR would still cause the
job to `gh pr checkout` that fork's branch and then `npm ci` (runs the fork's own `postinstall`
scripts) / `npx playwright test` (runs the fork's own `playwright.config.ts` and test files) —
all while the job still holds a `contents: write` token. That's the "pwn request" pattern: a
trusted action approving untrusted code that then runs with privileged credentials. Fixed with an
explicit **"Verify the PR branch is not from a fork"** step, *before* any checkout of PR content:
it fetches the PR via the API and compares `head.repo.full_name` to this repository; if they
don't match, the job fails closed (`core.setFailed`) before fetching or running a single line of
the PR's code, and the final comment reports "ignored — this PR is from a fork" instead of a
generic failure. See the `[RESOLVED]` entry in section 11 for how this was found. (This is all
`frontend/tests/`-era history, carried over here unchanged — the fork guard doesn't need any
`frontend/`-specific change once the workflow itself is retargeted.)

**Known limitation:** only works for PRs whose branch lives in this repository (not a fork) —
pushing an updated baseline needs write access to the branch, which a fork's branch doesn't grant
the base repo's `GITHUB_TOKEN`, and the guard above now also refuses to try. Not a concern today
(personal, single-maintainer repo) but this was a real, exploitable gap, not just a theoretical
one, given the repo is public.

**Permissions gotcha, found live (not in the REST docs):** both jobs grant `pull-requests: write`,
not `issues: write` — even though `github.rest.reactions.createForIssueComment` /
`github.rest.issues.createComment`'s own REST API docs say `issues: write` is what's needed, and
the API path is literally `/issues/comments/{id}/...`. In practice, GitHub's actual token-scope
check treats a comment that belongs to a pull request as a `pull-requests` resource regardless of
which REST path reaches it — `issues: write` alone fails with `403: Resource not accessible by
integration` for every comment this workflow ever touches, since `github.event.issue.pull_request
!= null` is already required by the job's own `if:` condition (this workflow never runs against a
plain, non-PR issue). See the workflow file's own `permissions:` comment for the full reasoning.

## 9. GitHub Pages

Reports are published via
[`peaceiris/actions-gh-pages`](https://github.com/peaceiris/actions-gh-pages), which pushes the
built Playwright HTML report to a `gh-pages` branch, into a subfolder per run
(`reports/pr-<number>/` or `reports/master/`), with `keep_files: true` so older reports from other
PRs aren't wiped out by a newer run. Unchanged from `frontend/tests/` — this mechanism has nothing
Vite/Next-specific about it.

**One-time manual setup** (already done, carried over unchanged from the `frontend/tests/`
implementation — nothing to redo here): repo **Settings → Pages**, source **Deploy from a branch**,
branch **`gh-pages`**, folder **`/ (root)`**.

After that one-time step, every workflow run publishes to
`https://<owner>.github.io/<repo>/reports/<pr-N|master>/` automatically — no further manual steps.

**The bare Pages root** (`https://<owner>.github.io/<repo>/`, with no `reports/...` path) is a
separate small landing page, published by a second `peaceiris/actions-gh-pages` step using
[`.github/scripts/generate-pages-index.mjs`](../../.github/scripts/generate-pages-index.mjs) — see
the known-issue below for why this exists at all.

**Known limitation:** this only works for PRs from branches within the same repository. A PR
from a fork wouldn't get a `GITHUB_TOKEN` with `contents: write` (GitHub's security model, not
something this workflow can work around), so the publish/comment steps would fail on a fork PR
while the actual test step itself still runs and reports pass/fail normally. Not a concern today
since this is a personal, single-maintainer repository with no external contributors, but worth
knowing if that ever changes.

## 10. Updating dependencies

### Versions installed initially (matching `frontend/tests/`'s versions at time of port)

- `@playwright/test`: `1.61.1`
- `@axe-core/playwright`: `4.12.1`
- `tsx`: `4.23.1` (new — needed to run `generate-pages-manifest.ts` as a standalone Node script;
  see section 4. Same version already used by `backend/` for its own scripts, kept in sync
  deliberately rather than picking a different one for no reason.)

Installed with:

```bash
cd web
npm install --save-dev @playwright/test@1.61.1 @axe-core/playwright@4.12.1 tsx@4.23.1
```

### How to bump these later

1. Check the current vs latest version: `npm view @playwright/test version` /
   `npm view @axe-core/playwright version`.
2. Read the Playwright release notes for the versions between what you have and the target,
   specifically for: changes to `toHaveScreenshot` defaults, changes to built-in `devices[]`
   presets (device names/viewports occasionally get added or renamed — this bit the original
   `frontend/tests/` implementation once, see [section 11](#11-known-issues--notes)), and changes
   to the HTML/GitHub reporters.
3. Bump in `frontend/package.json`, then run `npm install` (or `npm update @playwright/test
   @axe-core/playwright`) to refresh the root `package-lock.json`.
4. **Re-run `npx playwright install chromium`** after bumping `@playwright/test` — the npm
   package version and the downloaded browser binary version are coupled; an out-of-sync browser
   binary is the most common source of "works locally, fails in CI" (or vice versa) after a
   dependency bump.
5. Because baselines are pixel comparisons, a Chromium version bump can shift anti-aliasing
   subtly even with no code change — expect to possibly need one `--update-snapshots` run
   accepted via a PR (per [section 8](#8-accepting-new-baselines-from-a-pr-update-snapshots))
   right after a Playwright upgrade, and treat that particular baseline diff as "expected churn
   from the upgrade", not a real regression.
6. Also bump the Node version in `.github/workflows/visual-tests.yml` if you want to track a newer
   Node LTS — keep it in sync with `backend-web-checks.yml`'s Node version unless you have a
   specific reason to diverge (currently 20 here vs. 22 there; see that workflow's own comment for
   why it needs the newer one and why this suite doesn't).

## 11. Known issues & notes

_(Living section — append a new entry every time a real problem is hit during setup or later
maintenance. Do not delete old entries even if they're later fixed elsewhere — mark them
resolved instead, so the history of "what bit us" is preserved. Entries below inherited from
`frontend/tests/README.md` are kept verbatim, since they document real problems hit in code that
this suite still shares logic with — see section 1's "what actually changed" note.)_

### [RESOLVED, from this port] The suite originally queried the live DEV database, not a seeded test one

Shipped once, working end-to-end (verified live), but wrong: see section 12's 2026-07-27
"Correction" entry for the full writeup, including the four data-strategy approaches considered
and why the other three were filed as backlog instead of chosen. Short version: a regression
suite comparing against a database that changes every time someone adds real content through the
admin panel isn't testing for regressions, it's testing "did the content change" — which it
always will, eventually, for reasons that have nothing to do with a real bug. Fixed by
`backend/scripts/seed-e2e-fixtures.ts` (a hard reset-then-seed of `backend/.env.test`'s
`portfolio_test`, never the dev database) plus repointing `generate-pages-manifest.ts`/
`playwright.config.ts` at `.env.test`.

### [NEW, from this port] Playwright can't await a database query at module-import time — this forced a new script

First draft of this port tried the obvious thing: make `pages.manifest.ts` an `async function`
and call `await getPagesManifest()` at the top of `visual.spec.ts`/`a11y.spec.ts`, mirroring how
`app/(site)/*/page.tsx` already calls these same backend functions. Running `npx playwright test`
reported **zero tests found** — no error, just an empty run.

Root cause, confirmed by deliberately adding a `console.log` at the top of the spec file: it gets
required **twice** by Playwright — a fast, synchronous "discovery" pass that only counts/collects
`test()` calls (no test actually runs yet), then a second pass that executes them. Top-level
`await` only actually resolves during the second pass; during discovery, execution just... stops
at the `await`, so none of the `test()` calls after it (all of them, in this suite's design) ever
register. This matches reports from other real projects hitting the identical wall — see
https://github.com/microsoft/playwright/issues/12857 and
https://stackoverflow.com/questions/78158808 — both independently arrive at the same fix: **run
the async data-gathering as its own step before Playwright starts, write it to a file, read that
file synchronously inside the spec.**

Fix: extracted `generate-pages-manifest.ts`, a plain Node script (not a Playwright test file at
all, run via `tsx`) that does the actual `getAllWork()`/`getJournalEntries()`/`getPostBySlug()`
calls and writes `tests/.generated/pages-manifest.json`. `pages.manifest.ts` went back to being a
synchronous module — same shape as the original `frontend/tests/` version, just reading
pre-computed JSON instead of a static import. Every `test:e2e*`/`test:visual`/`test:a11y` npm
script now chains the generator in front of `playwright test`. See section 4 for the full design
writeup.

**Takeaway:** don't reach for top-level `await` in a Playwright spec file to solve "I need async
data before generating tests," even though it looks like it should work and the file will
happily type-check. Playwright's two-pass discovery model makes it silently produce zero tests
instead of an error, which is a worse failure mode than a thrown exception would have been.

### [NEW, from this port] `@portfolio/backend`'s PrismaClient needs `DATABASE_URL` loaded before the FIRST import, not just before it's *used*

Early draft of `generate-pages-manifest.ts` called `loadEnv({ path: ... })` and then had a normal
static `import { getAllWork, getJournalEntries } from "@portfolio/backend";` right below it in the
same file. This reliably failed with a Prisma connection error even though `loadEnv()` textually
ran first.

Root cause: ES module semantics fully evaluate a module's static imports (walking the whole
dependency graph, `@portfolio/backend` → `backend/src/db/client.ts`, which constructs the
`PrismaClient` at module scope) **before** the importing module's own top-level statements run —
regardless of where the `import` line sits in the file relative to other code. `db/client.ts`'s
`new PrismaPg({ connectionString: process.env.DATABASE_URL })` was therefore always evaluated
before `loadEnv()`'s side effect, no matter how the two lines were ordered textually.

Fixed by using a **dynamic** `await import("@portfolio/backend")` instead, inside an `async
main()`, called strictly after `loadEnv()`. Dynamic imports aren't part of the static module
graph — they evaluate imperatively, at the point they're actually awaited, so this genuinely runs
`loadEnv()` first. `next.config.ts` never hit this because it doesn't import `@portfolio/backend`
directly itself; it just sets `process.env` for Next.js's own later, separate module loads of the
route/page files (which happen long after `next.config.ts` finished running).

### [RESOLVED, from frontend/tests/] `toHaveScreenshot(name)` requires the `.png` extension in the name

First draft called `expect(page).toHaveScreenshot(\`${entry.name}-${theme}\`, ...)` (no
extension). Playwright throws `Screenshot name "..." must have '.png' extension` — the string
overload of `toHaveScreenshot` expects the extension as part of the name; it's not appended
automatically even though `snapshotPathTemplate` also has an `{ext}` placeholder. Fixed by
appending `.png` explicitly in `visual.spec.ts`.

### [RESOLVED, from frontend/tests/] Apple device presets (`devices["iPad (gen 7)"]`, `devices["iPhone 13"]`) default to WebKit, not Chromium

First draft of `playwright.config.ts` used these presets directly for the Tablet/Mobile
projects. Every test under those projects failed with:

```
Error: browserType.launch: Executable doesn't exist at .../ms-playwright/webkit-2311/Playwright.exe
```

Reason: Playwright's built-in `devices[]` dictionary ties each "device" to the engine that
actually powers that device in real life — iPhone/iPad presets emulate Safari, so they set
`defaultBrowserType: "webkit"` under the hood, regardless of what other projects in the config
use. Since this suite is deliberately Chromium-only (see section 2), only `chromium` gets
installed by `npx playwright install chromium` — so WebKit was simply never downloaded.

Fix: don't spread a full Apple device preset. Instead spread `devices["Desktop Chrome"]` (which
pins the Chromium engine) and override just the `viewport`/`isMobile`/`hasTouch` fields to get
tablet/mobile-shaped viewports while staying on Chromium.

**Takeaway for later:** if multi-browser (WebKit/Firefox) support is ever added, remember to run
`npx playwright install` for those engines too, and re-evaluate whether the Apple presets should
be used as-is at that point (they'd then make sense, since a real WebKit binary would exist).

### [RESOLVED, from frontend/tests/] Real, pre-existing accessibility violations found by `a11y.spec.ts`

The first real run against the actual site (before any test-code bugs were fixed) surfaced
genuine, site-wide `color-contrast` (WCAG "serious") violations — not test bugs. Confirmed
visually: the footer copyright line and various "faint"/muted labels were legitimately hard to
read against the near-black background in the exported screenshots.

- Rule: `color-contrast` (WCAG 2 AA, `wcag143`), impact `serious`.
- Affected token/classes seen across pages: `.text-text-faint` (footer copyright, ledger year
  columns, date labels), status badges (`.text-status-warning`/`.text-status-success` on their
  tint backgrounds), `.text-accent-solid`.
- Where: on **every** page tested, in **both** light and dark theme — this was a design-token
  issue, not a page-specific bug.
- Also found once: `scrollable-region-focusable` (serious) — a horizontally-scrollable region
  (likely a `CodeBlock`) that isn't reachable/operable via keyboard.

Fixed at the token level (see the "accent/status color fix" entry below) — this fix lives in the
design tokens/components themselves (ported to `frontend/src/shared/ui/theme/`), not in this test
suite, so it applies to both apps' history.

### [RESOLVED, from frontend/tests/] The accent/status color fix — full story (three attempts, two rejected)

This was the single biggest detour of the original `frontend/tests/` implementation, worth
keeping in full because the *reasoning* about why two fixes were rejected matters more than the
final diff.

**Attempt 1 — rejected: darken `palette.accent`/`statusGreen`/`statusAmber` globally.**
Scaled every channel of the vibrant orange/green/amber down uniformly (in linear sRGB) until the
worst-case contrast ratio cleared 4.5:1. Numerically correct, but visually wrong: darkening a
saturated orange this much makes it look muddy/brown, not "a deeper orange" — warm hues lose their
vibrancy fast as lightness drops. Reverted immediately — the lesson: **generate a real visual
preview before applying any color-token change, never just trust the contrast-ratio math.**

**Attempt 2 — accepted, partial: `accent.onSolid` / `status.onSolid` (dark ink on solid fill).**
The actual root cause was that a single token (`accent.solid` / `status.success` / `status.warning`)
was being reused for two incompatible roles: a **background fill** (must stay vibrant) and the
**foreground text color** drawn on a pale tint of the same color (fails contrast). Fix: keep the
vibrant fill untouched everywhere, redesign the affected badge/button components from "pale tint +
colored text" to "solid fill + dark ink text," reusing the site's own dark-theme near-black as the
ink color. Dark ink clears 7.5-11.3:1 depending on the fill.

**Attempt 3 — accepted: `accent.text` (a third, theme-aware role for plain inline text).**
Even after attempt 2, violations remained on **plain accent-colored text with no fill behind it**
(link color, eyebrow labels, etc.) — there's no background to put dark ink on, so the color itself
had to change on the light theme. Verified numerically (OKLCH-based search) that every value
clearing 4.5:1 against a near-white background reads as "burnt orange/rust" — a hard perceptual
limit of the hue, not a fixable calculation. Added `accent.text` (dark theme: identical to
`accent.solid`; light theme: a minimal darkening that still clears every real background it
appears on) and repointed the relevant call sites at it.

**Net result:** three distinct semantic roles now exist where there used to be one ambiguous
token — `*.solid` (fill), `*.onSolid` (text/dot on a solid fill of the same color), `accent.text`
(plain inline text with no fill). `WorkSummary`/`PostSummary` were never touched by any of this.

### [RESOLVED, from frontend/tests/] `toHaveScreenshot`/test timeouts under Docker resource constraints

While generating the initial `frontend/tests/` baselines inside the official
`mcr.microsoft.com/playwright` Docker image, several tests failed with `Timeout 5000ms exceeded` on
the screenshot stability check, and others with `Test timeout of 30000ms exceeded` on the heavier
`home` page (hero gradient/glow background). Root cause: Playwright retries capturing a screenshot
until two consecutive captures are pixel-identical (to avoid catching mid-animation frames), and a
CPU-throttled container running several parallel workers just needed more wall-clock time for that
to settle — not a real bug in the app or the tests. Fixed by raising both timeouts in
`playwright.config.ts`: `expect.toHaveScreenshot.timeout` from the 5s default to `15_000`, and the
top-level test `timeout` from the 30s default to `60_000`. Kept as-is in this port — GitHub Actions
runners are similarly modest (2 vCPU) regardless of which app is under test.

### [RESOLVED, from frontend/tests/] `heading-order` (moderate) on the landing page — tracked, not blocking

The very first full CI-equivalent run of `frontend/tests/` found one non-blocking (`moderate`
impact, below this suite's `critical`/`serious` failure threshold — see `BLOCKING_IMPACTS` in
`a11y.spec.ts`) finding: `heading-order` — "Heading levels should only increase by one" — on the
home page, in both themes. Not fixed as part of the original task (out of scope); worth
re-checking once this port's first real `test:a11y` run against `frontend/`'s landing page completes,
since the heading structure may or may not have carried over identically during the Next.js port.

### [RESOLVED, from frontend/tests/] `opacity-45` on the "upcoming" journal entry (also fixed)

The unpublished "upcoming" journal entry wrapped its *entire* block (already-AA-compliant text) in
`opacity-45`, which re-introduces exactly the contrast problem the token fixes above just solved —
`opacity` blends every pixel toward the page background. Fixed by dropping the `opacity-45`
wrapper entirely and instead relying on the tone system that was already there. This fix lives in
`JournalListPage.tsx` (ported to `frontend/src/views/journal-list/`), not in this test suite.

### [RESOLVED, from frontend/tests/] The "upcoming" entry title stopped visually de-emphasizing after the `opacity-45` fix

Caught by the user reviewing an actual screenshot, not by any test: after the `opacity-45` fix
above, the unpublished entry's title rendered at full brightness — visually indistinguishable from
a real published post's title. Root cause: the title used a manually-appended `className` override
(`text-text-muted`) alongside the `Text` component's own default `tone="primary"` class — which one
wins is generation-order-dependent, not something the className string itself controls. Fixed by
using the `tone` prop the `Text` component already exposes instead of fighting its output.
**Takeaway:** never override a design-system component's color via a raw same-specificity utility
class in `className` when the component exposes a prop for that; it may work by accident today and
silently flip later.

### [RESOLVED, from frontend/tests/] Master's baseline auto-commit silently failed — `master` has a protected-push ruleset

Discovered via the GitHub API (job step logs), not from an obviously-red check — the master run
itself looked green-ish but the "Commit updated baselines" step had `conclusion: "failure"` buried
in the job's step list. Root cause: `master`'s repository ruleset blocks direct pushes, including
from `stefanzweifel/git-auto-commit-action` running with the default `GITHUB_TOKEN` and
`contents: write` — branch-protection rulesets take precedence over what a workflow's own
`permissions:` block grants.

Replaced entirely with the architecture in section 8: baselines are accepted **before** merge,
from the PR branch (via `/update-snapshots`), so `master` never needs to accept a direct push for
this at all.

### [RESOLVED, from frontend/tests/] Bare GitHub Pages root 404s — permanently, not a delay

The `gh-pages` branch only ever gets written to under `reports/<dest>/` — nothing publishes an
`index.html` at the actual branch root. Fixed by adding a second, small
`peaceiris/actions-gh-pages` step to the workflow that publishes a one-page static landing page
straight to the branch root, with `keep_files: true` so it doesn't wipe the `reports/` folder.

### [RESOLVED, 2026-08-11] A seeding-script bug cascaded into a SECOND, unrelated-looking CI failure

Real CI run: `test:e2e:seed-fixtures` failed on a Prisma validation error (a `Work` fixture's
required `date` field never reached `createWork()` — see `backend/scripts/README.md`'s own dated
entry for that bug's root cause). Because `test:e2e:prepare` failed BEFORE Playwright ever started,
no `frontend/playwright-report/` directory existed by the time the "Publish report to GitHub
Pages" step ran (`if: always()`, by design — see this section's own intro). `peaceiris/actions-gh-pages`
does not degrade gracefully when its `publish_dir` doesn't exist: it logged an `ENOENT`, concluded
this must be a "first deployment," and unconditionally ran `git checkout --orphan gh-pages` — which
then failed outright ("a branch named 'gh-pages' already exists," since a prior successful run had
already created it). One real, attributable failure became two confusing ones in the same job,
with the second one's error message pointing nowhere near the actual cause.

Fixed by adding a "Check report was produced" step (`if: always()`, a plain `[ -d ... ] && [ -n
"$(ls -A ...)" ]` check into `$GITHUB_OUTPUT`) immediately before the publish step, and gating that
publish step on its result. `format-summary.mjs` already had the equivalent guard for the OTHER
half of this same failure mode (a missing `test-results/summary.json` — see its own `fs.existsSync`
check) — this closes the one spot that didn't.

**Corrected first draft, caught by a direct question, not found independently.** The very first
version of this check only wrote `exists=false` to `$GITHUB_OUTPUT` and let the publish step's own
`if:` quietly skip — no failed/red step anywhere explained WHY the report never got published, the
exact "verification silently skips instead of failing loudly" pattern this repo's rules explicitly
warn against. The job as a whole still failed either way (the real "Run tests" step is unconditional
and already red), but a silently-skipped step is still a worse signal than an explicit one. Fixed by
having the check step itself `exit 1` with an `::error::` annotation pointing back at "Run tests"
when the report is missing, so the skip is accompanied by its own loud, attributable failure instead
of a quiet gap.

### [RESOLVED, from frontend/tests/] `/update-snapshots` had a "pwn request" vulnerability — trusted commenter, untrusted code

Flagged by an automated code-review comment — `github.event.comment.author_association` (who
posted the comment) says nothing about whose code is checked out and executed. A trusted
maintainer commenting `/update-snapshots` on a malicious fork PR would unknowingly hand that
fork's code push-capable credentials (the "pwn request" pattern). Fixed with a
`head.repo.full_name` check against the PR via the API, run *before* any checkout of PR content —
see the updated section 8 for the exact mechanics.

### [RESOLVED, from frontend/tests/] First real `/update-snapshots` run failed — mangled `Checkout` step + a template-literal bug

Two separate, unrelated bugs from a single real run: (1) the `Checkout` step got mangled during a
merge (a bad conflict resolution swapped it for `actions/setup-node@v4`, dropping the real
checkout/setup steps entirely) — fixed by restoring the three distinct steps; (2) the
failure-comment's workflow-run link used double-quoted string concatenation instead of a template
literal, so `${...}` never interpolated and the literal placeholder text got posted as a broken
link — fixed by switching to an actual backtick template literal. **Takeaway:** embedded
`script: |` blocks in workflow YAML are opaque strings to a YAML parser — YAML validation catches
YAML structure problems, but says nothing about the JavaScript logic inside those blocks.

### [RESOLVED] `/update-snapshots` 403'd on the reaction step — `issues: write` was the wrong scope

Found live, on the very first real `/update-snapshots` run against `frontend/`'s port of this
suite (after `web/` → `frontend/`): `actions/github-script@v7`'s `reactions.createForIssueComment`
call failed with `RequestError [HttpError]: Resource not accessible by integration`, `status: 403`,
even though the job's `permissions:` block granted `issues: write` — which is exactly what both the
reactions and issue-comment REST endpoints document as sufficient, and matches the literal
`/issues/comments/{id}/...` API path.

**Root cause:** GitHub's actual `GITHUB_TOKEN` scope enforcement does not go by the REST path — a
comment that belongs to a pull request is scoped as a `pull-requests` resource, full stop, and
`issues: write` grants write access to a *different* resource that happens to share a REST
endpoint prefix. Since this workflow's own `if:` condition already guarantees
`github.event.issue.pull_request != null` (it only ever runs on PR comments, never a plain issue),
`issues: write` was pure dead weight granting the wrong permission for the one thing this workflow
actually does. Confirmed against multiple independent real-world reports of the identical 403 on
the identical endpoint before concluding this wasn't an isolated fluke.

**Fix:** both jobs' `permissions:` now grant `pull-requests: write` instead of `issues: write` (the
`guard` job also dropped a redundant `pull-requests: read`, since `write` already implies `read` on
the same resource). No code changes needed — `github.rest.issues.createComment`/
`reactions.createForIssueComment` are still the right SDK calls; only the token scope was wrong.

### [RESOLVED] The full suite (`test:e2e`) hung for 60s on `networkidle`, caused by rate limiting

**Found live**, while investigating a separate report of "rate limiting breaks the tests": running
`npm run test:e2e` (44 tests, `fullyParallel: true`) reliably passed in isolation (`test:a11y`
alone, or a single `-g` filter) but hung with `Test timeout of 60000ms exceeded` /
`page.waitForLoadState: Test timeout of 60000ms exceeded` on `waitForLoadState("networkidle")`,
specifically on link-heavy pages (`work-list`) toward the END of a full run — never at the start.

**Root cause.** `frontend/src/proxy.ts`'s per-IP rate limiter (`global`, 300 requests/5 minutes —
see `backend/src/auth/README.md`) is keyed by IP, and every test in this suite shares ONE IP
(localhost). 44 page visits, each triggering Next's own automatic background prefetching of every
visible `<Link>` on that page, comfortably exceeds 300 requests well before the suite finishes.
That alone isn't new — but combined with the 2026-07-28/29 status-page work
(`frontend/src/shared/ui/status-page/README.md`), a blocked request now gets a REAL redirect
response (to the "fun" `/error/429` page) instead of a harmless JSON body the router used to just
fail to parse and silently drop. Once the shared budget was exhausted, EVERY subsequent prefetch
on a link-heavy page got that redirect, and Playwright's `networkidle` wait — which requires a
genuine quiet window with no in-flight requests — never got one.

**Why this isn't (and shouldn't become) a rate-limiting test.** Rate limiting already has its own
fast, deterministic unit suite (`frontend/src/proxy.test.ts`) that doesn't need a real browser or
server at all. This suite's job is visual/accessibility regressions — it has no reason to also
verify abuse protection, and doing so by accident (as a side effect of shared IP-based state) only
adds flakiness with zero added signal.

**Fix.** `frontend/src/proxy.ts`'s `enforceRateLimit` now short-circuits entirely when
`process.env.DISABLE_RATE_LIMIT === "true"` — set in `backend/.env.test` (loaded by
`playwright.config.ts` and inherited by the `webServer`-spawned `next build && next start`
process) and as a job-level env var in both `visual-tests.yml` and `accept-visual-baselines.yml`
(CI doesn't load a `.env.test` file at all — see those workflows' own `env:` block comments).
Never set in dev or production. Also added to `backend/.env.test.example` so a fresh clone gets it
automatically on first `cp .env.test.example .env.test`.

**Verified live, twice.** First reproduced the hang on a clean run (killed all stray Node/port-3100
processes first, to rule out leftover state from earlier manual testing as the cause). Then, after
the fix: `npm run test:e2e` completed in 1.2 minutes (down from ~2 minutes) with zero timeouts — the
30 visual failures that remain are the genuine, expected Windows-vs-Linux pixel-diff noise this
document's section 2 already warns about (single-digit-percent pixel ratio differences, not the
~97%-different images seen while the hang was also silently corrupting some pages' actual content).

**Takeaway.** Shared, IP-keyed state (rate limiting, in this case) that's invisible to a test
author is a real category of e2e flakiness — not just "the app is slow" or "the network is
flaky." When a hang or failure looks unrelated to what a suite is actually testing, check for a
cross-cutting concern (rate limits, caches, singletons) that only surfaces under the specific
concurrency/volume that suite happens to generate.

### Design change: content-driven visual diffs are accepted via PR comment, not avoided

Initially considered (in the original `frontend/tests/` implementation): masking the "living"
content areas of `home`/`work-list`/`journal-list` with Playwright's `mask` option, so adding a
new work item or journal post would never trigger an "expected" visual diff there in the first
place. Superseded by the `/update-snapshots` mechanism (section 8) before being implemented: that
mechanism solves the actual underlying friction more generally — it also covers genuine
template/design changes on those same pages, which masking never would have. Carried over
unchanged into this port; revisit only if `/update-snapshots` itself turns out to be too much
friction for routine content updates in practice.

## 12. Implementation log

_(Living, append-only. One entry per small implementation step: date, what was done, which files
changed, what didn't work and how it was fixed. Entries before the "port to frontend/tests/" heading
below are inherited verbatim from `frontend/tests/README.md`, since they document the history of
code this suite still shares logic with.)_

### 2026-07-17 — Guide skeleton created (frontend/tests/)

Created `frontend/tests/README.md` with all 12 sections as placeholders. No code changes yet.

### 2026-07-17 — Dependencies, Playwright config, manifests, specs (frontend/tests/)

Installed `@playwright/test@1.61.1` and `@axe-core/playwright@4.12.1`, added npm scripts, created
`playwright.config.ts` (3 Chromium-based projects), the dynamic/static manifest pair, `utils/
theme.ts`, both specs, and the summary reporter. Fixed the `.png`-extension and WebKit-preset bugs
(section 11). First full run: 40/40 passed (30 visual + 10 a11y), one non-blocking `moderate`
finding.

### 2026-07-17 — CI workflow, GitHub Pages publishing, initial baselines (frontend/tests/)

Created `visual-tests.yml` and `format-summary.mjs`. Generated the actual initial 30 baseline PNGs
using the official `mcr.microsoft.com/playwright` Docker image, matching CI's exact
OS/Chromium/worker-count combination. Hit and fixed two timeout issues (section 11).

### 2026-07-17 — Baselines reorganized into one folder per page (frontend/tests/)

Switched from a flat screenshot name to an array name, turning 30 flat files into 5 folders of 6
files each — verified with one test first before regenerating all 30.

### 2026-07-17 — Real UX bug caught from a screenshot (frontend/tests/)

User spotted the unpublished journal entry's title rendering at full brightness from an actual
screenshot — see the `[RESOLVED]` entry in section 11.

### 2026-07-18 — First real PR/master run surfaced two more bugs, plus a bigger architecture change (frontend/tests/)

Found the master baseline auto-commit was silently failing (repository ruleset blocking direct
pushes) and a transient Pages-report 404. Redesigned around `/update-snapshots` (section 8) instead
of patching the master auto-commit. Also fixed the permanent bare-Pages-root 404. This document
moved from `VISUAL_TESTING_GUIDE.md` at the repo root to `frontend/tests/README.md`.

### 2026-07-18 — Security review caught a real "pwn request" gap; first live run then caught two more bugs (frontend/tests/)

Added the fork-guard step to `accept-visual-baselines.yml`. First real `/update-snapshots` trigger
failed from a mangled `Checkout` step (lost in an unrelated merge) and a template-literal bug in
the failure-comment link — both fixed, see section 11.

### 2026-07-27 — Port to `web/tests/` (this port; `web/` was later renamed `frontend/`)

- Ported `visual.spec.ts`, `a11y.spec.ts`, `utils/theme.ts`, `reporters/summary-reporter.ts`
  byte-for-byte (logic unchanged — same matrix, same theme-seeding, same blocking-impact set).
  Confirmed this app's theme storage key (`portfolio.theme-preference`,
  `frontend/src/shared/theme/theme.context.tsx`) matches the legacy Vite SPA's exactly, so `utils/theme.ts`
  needed zero changes.
- Hit the top-level-`await`-in-a-spec-file wall while trying to make `pages.manifest.ts` async
  directly (see section 11's new entry) — extracted `generate-pages-manifest.ts` as a separate
  pre-step instead, writing `tests/.generated/pages-manifest.json`; `pages.manifest.ts` went back
  to a plain synchronous `fs.readFileSync`, and `visual-fixtures.manifest.ts` needed no changes at
  all beyond its doc comment, since it only ever consumed `pages.manifest.ts`'s exported array,
  not the async source directly.
- Hit a second, more subtle ordering bug inside `generate-pages-manifest.ts` itself — a static
  `import` of `@portfolio/backend` evaluated before the file's own `loadEnv()` call, regardless of
  line order, because ES modules always finish evaluating static dependencies first (see section
  11's second new entry). Fixed with a dynamic `await import(...)` instead.
- `WorkSummary.hasCaseStudy` (already a cheap boolean on the type — see
  `backend/src/content/work.ts`) let the work-detail-page filter avoid any extra per-item query,
  an improvement over the frontend/tests/ original's static-array `.filter()`. `PostSummary` has
  no equivalent flag, so the journal-detail-page filter calls `getPostBySlug()` per entry — the
  same existence check `app/(site)/journal/[slug]/page.tsx` itself makes before rendering, just
  run once up front instead of per-request.
- Added `frontend/tests/tsconfig.json` as its own small TS project, and excluded `tests/` from
  `frontend/tsconfig.json`'s `include` set — confirmed (via Next.js's own docs, not assumed) that `next
  build`'s type-check step runs across the *entire* project selected by `tsconfig.json`, only
  auto-skipping files matched by `*.test.*`/`*.spec.*` by name. Without this exclusion,
  `generate-pages-manifest.ts`/`pages.manifest.ts`/etc. (none of which match that naming pattern)
  would have broken `next build` — and by extension, `backend-web-checks.yml`'s existing `npm run
  build` step in `frontend/` — for reasons having nothing to do with the app itself.
- Swapped the `webServer` command from Vite's `build && preview -- --port 4173` to Next's `build
  && start -- -p 3100` (a different fixed port, chosen only to avoid colliding with an already-
  running `next dev` on its own default 3000).
- Did not copy `frontend/tests/visual-snapshots/*.png` — Next's SSR markup doesn't pixel-match the
  old Vite output closely enough for a diff tool to treat them as the same baseline; fresh
  baselines are generated the same way the original ones were (CI/Docker on Linux, never Windows),
  once a database with real seeded content is available to generate the page manifest against.
- Left CI retargeting (`.github/workflows/visual-tests.yml`,
  `.github/workflows/accept-visual-baselines.yml`) untouched — that's a separate, later step in the
  `frontend/` retirement plan, not part of this port. Sections 7/8 above call this out explicitly
  rather than describing CI as already wired to `frontend/tests/`, which it isn't yet.

### 2026-07-27 — Correction: this suite shipped querying the live dev database, and that was wrong

**What happened.** The version of this port described in the entry above worked end-to-end
(verified live: `generate-pages-manifest.ts` ran against a real Postgres, `next build` typechecked,
30/30 `test:a11y` passed against a real built/started server) — but it pointed
`generate-pages-manifest.ts` and the `webServer`-started app at `backend/.env`'s real DEV
database, the same one a developer edits by hand through the admin panel day to day. This shipped
without asking first, which is exactly the mistake: a data-source strategy for a test suite is a
real architectural decision with several legitimate answers, not a detail to silently pick and
move on from.

**Why it was actually wrong, not just a style disagreement.** A regression suite exists to answer
"did something ACTUALLY break," which requires comparing against a KNOWN, FIXED baseline. Querying
the dev database means the set of pages under test — and everything they render — silently
changes every time someone adds a work item or journal post through the admin panel. Two
consequences, both real: (1) `visual.spec.ts`'s curated fixture pages would drift out of sync with
what the dynamic manifest considers valid (`visual-fixtures.manifest.ts`'s own "stale fixture"
guard exists for exactly this), and (2) a passing run today and a passing run next week aren't
comparable evidence of "nothing regressed" — they might just both happen to reflect whatever
content existed at each moment, which is not what "visual regression testing" is supposed to mean.

**Four real, current (2026) approaches were discussed before choosing a fix** — recorded here
because the trade-offs matter more than the final pick, and the three not chosen are backlog, not
rejected ideas:

1. **Seeded, isolated test database with deterministic fixtures** (chosen). Real Postgres, real
   Prisma queries, real `notFound()`/routing behavior — the actual integration is genuinely
   exercised, just against fixed, known content instead of whatever the dev DB happens to contain
   right now.
2. **Fake in-memory backend, swapped in for `@portfolio/backend` at build time** (via a bundler
   `resolveAlias`, env-gated). Zero database dependency at all, maximally deterministic — but the
   real Prisma/schema integration this suite is also supposed to exercise (a11y/visual checks
   catching e.g. a broken query, not just a broken template) wouldn't be covered by this suite at
   all anymore. Filed as a legitimate future option, not implemented.
3. **MSW + Next.js's experimental `testProxy`**, intercepting `fetch()` during SSR. Confirmed (by
   reading the actual code, not assumed) that this **cannot work for the pages this suite targets
   as currently architected**: `frontend/`'s public Server Components call `@portfolio/backend`
   directly, in-process — a plain function call to a Prisma-backed function, never a `fetch()` —
   and MSW only ever intercepts the network/fetch layer. It has nothing to intercept here. It
   would apply naturally to the admin panel's CLIENT components, which do call `fetch()` against
   `/api/admin/*` — filed as a real, correctly-scoped idea for a FUTURE admin-flow test suite, not
   this one.
4. **Storybook-level component isolation** (`frontend/src/views/storybook/` already exists as a
   dev-only playground). Screenshot individual templates with fixed props, no database or routing
   involved at all — fast and maximally deterministic, but a different, complementary layer
   (proves "does the template render correctly in isolation," not "does the real integrated page
   work") rather than a replacement for what `visual.spec.ts`/`a11y.spec.ts` already do. Filed as a
   future addition.

**The actual fix.** `backend/scripts/seed-e2e-fixtures.ts` (new — see its own doc comment and
`backend/scripts/README.md`'s dated entry) hard-resets `backend/.env.test`'s `portfolio_test`
database and inserts 3 work items (2 with a case study, 1 without) and 3 posts (2 with a body, 1
"upcoming" stub without), reusing `createWork`/`createPost` — the same functions the admin panel's
own API routes call — rather than duplicating `Document`/`Block` creation logic. Both
`generate-pages-manifest.ts` and `playwright.config.ts` were repointed from `backend/.env` to
`backend/.env.test`. A new npm script chain, `test:e2e:seed-fixtures` → `test:e2e:generate-manifest`
(together, `test:e2e:prepare`), runs before every `playwright test` invocation via
`test:e2e`/`test:visual`/`test:a11y`/`test:e2e:update`.

**Verified live, again, after the fix** — not assumed to "still work" just because it worked
before the change: reseeded `portfolio_test` twice in a row (confirms the reset-then-seed is
idempotent, no leftover-row unique-constraint errors), regenerated the manifest (now a fixed 7
pages: 3 static + `work-navigation-engine` + `work-onboarding-flow` + `journal-flowbus` +
`journal-testing-culture` — `internal-tooling` and `upcoming-draft` correctly excluded, proving
both filter branches in `generate-pages-manifest.ts` are now actually exercised, not just
theoretically reachable), and re-ran the full `test:a11y` suite against a real built/started
server pointed at the seeded test DB: **14/14 passed**. Also queried the DEV database directly
afterward to confirm the seed script never touched it (`portfolio.work` row count unchanged from
before this fix).

**Takeaway.** "It works end-to-end" and "it's the right design" are different claims — this
suite passed its own live verification the first time and was still fundamentally wrong about
where its data should come from. The fix for that kind of gap is asking a real question up front,
not more testing after the fact.

### 2026-07-27 — CI retargeted from the legacy `frontend/tests/` to `web/tests/` (later renamed `frontend/tests/`)

**What needed doing.** `.github/workflows/visual-tests.yml` and
`.github/workflows/accept-visual-baselines.yml` still pointed entirely at `frontend/tests/` (the
legacy Vite SPA), even though the suite itself had already been ported to `web/tests/` (later renamed
`frontend/tests/` — the entry above). Sections 7/8 of this document explicitly called out this gap as a caveat rather than
pretending CI already worked — this entry closes it.

**What was actually done, not just a path find/replace.** This wasn't a pure mechanical rename:
This app's test suite's data source is a real Postgres database (unlike the legacy `frontend/tests/`'s static
in-repo import), so both workflows needed real additions, not just `frontend` → `web` path swaps:

- Added an ephemeral `postgres:16-alpine` service container to both jobs — same
  image/user/password/database settings as `backend-web-checks.yml`'s own job, kept in sync
  deliberately rather than inventing a second convention for the same thing.
- Added `DATABASE_URL`/`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` as real job-level env vars (not a
  `backend/.env.test` file, which is gitignored and doesn't exist in CI) — `generate-pages-
  manifest.ts` and `next.config.ts` already anticipated this in their own doc comments (their
  `loadEnv()` calls are no-ops when the variable is already set), it just hadn't been wired up yet.
- Added an explicit "Apply migrations to the CI database" step (`npx prisma migrate deploy` in
  `backend/`) before Playwright starts — `frontend/tests/`'s version never needed this at all.
- Changed dependency install from `working-directory: frontend` (the legacy Vite SPA) + its own `package-lock.json` to a
  **root-level** `npm ci` with `cache-dependency-path: package-lock.json` — `web`/`backend` (`web` later
  renamed `frontend`) are npm workspace members sharing one root lockfile; the legacy Vite SPA was a standalone app with its own.
  **This deviates from the retirement plan's literal text** (which said `cache path →
  frontend/package-lock.json`), because no such file exists or should exist once `frontend/` is a workspace
  member — installing with `working-directory: web` would fail outright (no lockfile there to
  resolve against). Verified live: `npm ci` at the root correctly hoists and symlinks
  `@portfolio/backend` the same way local `npm install` already does for every other workflow in
  this repo.
- Replaced the separate "Run tests" (`npx playwright test`) step's implicit assumption that no
  prepare step is needed with `npm run test:e2e` (visual-tests.yml) / `npm run test:e2e:update`
  (accept-visual-baselines.yml) — both already chain `test:e2e:seed-fixtures` →
  `test:e2e:generate-manifest` in front of the actual Playwright invocation (see section 4), so a
  bare `npx playwright test` in CI would have failed immediately with `pages.manifest.ts`'s own
  "run the prepare step first" error.
- `.github/scripts/format-summary.mjs` hardcoded its OUTPUT path as `frontend/pr-comment.md` in
  two places (not just the `summaryPath` it receives as an argument) — missed on a first read of
  the plan's diff list, which only mentioned workflow YAML files. Caught by actually reading the
  script's full source before assuming the retarget was complete; fixed both hardcoded paths to
  `frontend/pr-comment.md` to match the workflow's own `Comment on PR` step.

**Understandability.** Both workflow files now carry a top-of-file comment explaining why the
Postgres service/env/migration step exist (pointing at `generate-pages-manifest.ts`'s own comment
for the deeper reason), so a future reader doesn't have to reverse-engineer "why does a visual
test workflow need a database" from the diff alone.

**Migration/fault-tolerance impact.** None beyond what `backend-web-checks.yml` already
established — same ephemeral-container pattern, same failure mode (a flaky/slow Postgres container
fails the health check and the job fails loudly, not silently).

**SOLID angle.** Not applicable in the class-design sense — this is CI configuration, not
application code. The relevant discipline here was reuse (Don't Repeat Yourself at the
infrastructure level): the Postgres service block, env var names, and migration step are copied
verbatim from `backend-web-checks.yml` rather than inventing a slightly different second version of
the same setup.

**Not yet done.** Since no baselines exist yet in `frontend/tests/visual-snapshots/` (the port's own
entry above notes fresh baselines still need generating), the very first real run of
`visual-tests.yml` against this retarget will fail on every visual assertion until that initial
generation happens — expected, not a bug in this retarget, and tracked as the next step in the
`frontend/` retirement plan, not this one.

### 2026-07-29 — `DISABLE_RATE_LIMIT` added to fix a real `npm run test:e2e` hang

Full writeup in section 11's `[RESOLVED]` entry with the same date. Short version: the suite's own
traffic (44 tests x automatic `<Link>` prefetching, one shared IP) exhausted `proxy.ts`'s rate
limiter mid-run, and — after the same day's status-page work made a blocked request redirect for
real instead of returning an ignorable JSON body — that turned into a genuine 60s
`networkidle`-timeout hang rather than a quick, harmless failure. Fixed with an explicit
`DISABLE_RATE_LIMIT="true"` env var, set in `backend/.env.test`/`.env.test.example` and as a
job-level env var in both `visual-tests.yml` and `accept-visual-baselines.yml`. Verified live:
reproduced the hang, then confirmed `npm run test:e2e` completes cleanly (1.2m, zero timeouts)
after the fix.

### 2026-08-03 — Component-level snapshots added (`component-gallery.spec.ts`), closing the 2026-07-27 backlog item

**What needed doing.** The 2026-07-27 "Correction" entry above listed four real data-strategy
options for this suite and filed option 4 ("Storybook-level component isolation") as a future
addition, not a rejected idea. Separately: `visual.spec.ts`'s 5 curated pages leave real gaps —
several `shared/ui` components (`Eyebrow`, `StatusBadge`, `PlaceholderCover`, `Markdown`,
`SkillCard`, `ContentBlocks`'s quote/note/approachList/diagram block types) don't render
distinctively (or at all) on any of those 5 pages, so a real appearance regression in one of them
could ship with the existing suite fully green.

**What was actually done.** Added `component-gallery.manifest.ts` +
`component-gallery.spec.ts` (see the new "Component-level snapshots" subsection in section 4 for
the full design: the `data-component-id` contract, the manifest/live-page staleness guard, the
narrower Desktop-only/2-theme matrix, and the PlantUML exclusion). Extended the existing
`/storybook` playground (`DesignSystemPlayground.tsx` + `Storybook.tsx`) with `data-component-id`
on its 8 existing demo sections plus 6 new ones (`eyebrow`, `status-badge`, `placeholder-cover`,
`markdown`, `diagram`, `content-blocks`) and one on `Storybook.tsx`'s own `SkillsSection`
(`skill-card`) — 15 components total. Added `test:visual:components` / `test:e2e:update:components`
/ `test:e2e:update:all` npm scripts, and repointed `accept-visual-baselines.yml`'s regenerate step
from `test:e2e:update` to `test:e2e:update:all` so a single `/update-snapshots` comment accepts
both suites together. `visual-tests.yml` needed zero changes — it already runs bare
`npm run test:e2e` (unscoped `playwright test`), which picks up the new spec file automatically.

**A real, pre-existing gap surfaced while scoping this, not introduced by it:** confirmed (by
reading `seed-e2e-fixtures.ts`) that no seeded fixture currently includes a `diagram`-type block —
`Diagram`'s Mermaid *and* PlantUML rendering paths had zero automated visual coverage before this
change, page-level or otherwise. This change closes the Mermaid half (fully client-side,
deterministic, safe to screenshot). The PlantUML half stays open — its self-hosted
`plantuml-server` dependency isn't started anywhere in this suite's `webServer` or CI job — and is
called out explicitly as a known limitation in section 4 rather than silently left uncovered with
no explanation.

**Design decision worth recording:** considered auto-discovering every `[data-component-id]` (or
even every `<section>`) on the page at runtime instead of maintaining a separate manifest file, to
avoid the exact "two files can drift apart" risk `visual-fixtures.manifest.ts` already has for
pages. Rejected for the same reason the page-level suite didn't do this either: Playwright's
two-pass discovery model (section 11) needs a synchronous, statically-known test list at
collection time, and a live DOM query can only happen inside a running test, not before one. Kept
the manifest, but added the staleness-guard test as the mitigation — same trade-off the existing
page-level suite already made, applied consistently rather than solved differently just because it
was a second, later addition.

**Verified live:** `npx tsc --noEmit` on both `frontend/tsconfig.json` (app code) and
`frontend/tests/tsconfig.json` (spec/manifest code) — the only pre-existing error surfaced
(`utils/theme.ts`'s `window` reference, `types: ["node"]` not including `"dom"`) was confirmed via
`git stash` to already exist before this change, unrelated to it. Ran
`npm run test:visual:components` locally against a real built/started app to confirm the guard
test and every screenshot test actually execute (screenshot tests fail with "no baseline exists"
on a fresh checkout, which is expected — same as the page-level suite's very first run before its
initial baselines existed, per this section's 2026-07-17 entry). Real baselines get generated the
same way the original ones were: CI or Docker (Linux), never a raw local Windows run — see section
2's font-rendering explanation, unchanged and equally true for component screenshots.

### 2026-08-11 — Three new components added to the gallery, one deliberately excluded

Part of the Work Item Covers & Unified Identity Hue UI unification: `TagList`,
`RelatedContentCallout`, and `CompactRelatedLink` (`related-content-callout`'s second export) each
got a demo section (`tag-list`, `related-content-callout`, `related-link`) with fixed, deterministic
props — 18 components total now. `RelatedItemPicker` was deliberately NOT added — same reasoning as
the existing `token-combobox` exclusion (see the manifest's own doc comment, updated to name it
explicitly): it's admin-auth-only and its entire value is in interaction a static screenshot can't
exercise, covered instead by its own `RelatedItemPicker.test.tsx`.

### 2026-08-14 — Design-token migration invalidates every existing baseline (page-level, component-gallery, OG-image)

**Why this entry exists.** The design-token architecture refactor
(`packages/design-tokens` + `shared/ui/theme/{tokens,contracts,themes,components,composites}`,
see that directory's own `README.md`) is a real, intentional pixel change, not
noise: `statusDanger` is a genuinely new, distinct red (`status-error` used to
alias `warning`/amber before this), and the brand accent's hue was corrected
(`ARCHITECTURE.md`'s own note — an earlier export read OKLCH's hue angle as if
it were HSL's). Every existing page-level, component-gallery, and OG-image
baseline that touches a color token will diff after this lands.

**Not regenerated as part of this change, deliberately.** This environment has
no Linux Docker Playwright runner set up (checked: Docker itself is available
locally — a Postgres and a `plantuml-server` container are already running for
other purposes — but no Playwright browser image/compose service exists yet),
and section 2's font-rendering rule is exactly why a raw Windows-local run
would produce baselines that themselves need throwing away. Also added
`design-tokens` (`{ id: "design-tokens", label: "DesignTokens" }`) to
`component-gallery.manifest.ts` — a genuinely NEW component-gallery entry, not
just a changed one, so it has no baseline at all yet, existing or otherwise.

**What to actually do:** run this suite for real once, from CI or the
`/update-snapshots` PR-comment mechanism (section 8) — never a local `npm run
test:e2e:update:all` on this machine. Confirmed structurally sound short of
that: `npm run build`, `npx tsc --noEmit`, and the full `npm test` (468 tests)
all pass against the new token pipeline; `component-gallery.manifest.ts` and
`DesignSystemPlayground.tsx`'s live `[data-component-id]` set were kept in
sync by construction (one new entry added to both in the same change), so the
suite's own guard test should pass without needing a real browser to check
that specific claim.
