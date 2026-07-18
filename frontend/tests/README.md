# Visual Regression & Accessibility Testing — Personal Guide

> Personal runbook for the screenshot / visual-regression / accessibility CI added to this
> repository. This document is meant to be read top-to-bottom the first time, then used as a
> reference. Section 11 and 12 are living sections — they get updated every time something in
> this setup changes or breaks.

Status legend used below while this guide is being filled in: `TBD` = not written yet, will be
filled in as the corresponding implementation step lands.

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

This repo has automated screenshot (visual-regression) and accessibility testing, running on
every pull request and on every push to `master`. It exists to catch three kinds of problems
before they ship: unintended visual/layout regressions, broken responsiveness across
desktop/tablet/mobile, and accessibility/contrast issues — across both the light and dark themes.

**Tooling:** [Playwright](https://playwright.dev) (`@playwright/test`) for browser automation and
pixel-diff screenshots, plus [`@axe-core/playwright`](https://github.com/dequelabs/axe-core-npm)
for accessibility scans. Both are free and self-hosted (no third-party SaaS account needed), and
Playwright's built-in `toHaveScreenshot()` stores baseline images as plain PNGs committed directly
in this repo (`frontend/tests/visual-snapshots/`) — that's the "references" folder.

**Matrix:** every real page × light/dark theme × 3 viewports (Desktop 1440×900, Tablet 834×1194,
Mobile 390×844), all on Chromium. Locale is fixed to `en` (the site's default) to keep the matrix
size reasonable; see section 4 for why *which* pages get pixel-diffed vs. just accessibility-
scanned isn't the same list.

**Baselines are accepted from the PR, before merging** — `master` has a repository ruleset that
blocks direct pushes (even from a bot with `contents: write`), so it can't fix its own baselines
after the fact. Instead, when a visual check fails just because the page's own content changed
(new work item, new journal post — not a real bug), commenting `/update-snapshots` on the PR
regenerates and pushes the new baselines straight to that PR's branch, turning the check green
before you merge. See section 8.

**Reports:** Playwright's HTML report (actual/expected/diff view for every failed screenshot) gets
published to GitHub Pages on every run, and a sticky comment on the PR summarizes pass/fail counts
and any accessibility violations found, with a link to the full report (section 7).

**Why this document exists:** it's the single place documenting every decision made while
building this — including two color-token fixes that were tried and rejected before landing on
the final approach (section 11) — so that six months from now, "why is this token named like
this" and "why does this CI step exist" both have answers here instead of having to be
reverse-engineered from git history.

## 2. Environment & initial setup

### Requirements

- Node.js 20+ (the CI workflow pins **Node 20** to match the existing `deploy_release.yaml`
  workflow; locally this was developed against Node 22.22.0, which also works fine — the app has
  no Node-version-specific code).
- npm (comes with Node). This repo uses `npm ci`/`package-lock.json`, not yarn/pnpm.

### First-time setup

```bash
cd frontend
npm ci                                # install all dependencies, incl. @playwright/test, @axe-core/playwright
npx playwright install chromium       # downloads the Chromium browser binary Playwright drives
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
this whole setup.

The resolution: **baselines are always generated by CI (Ubuntu/Linux), never by a manual local
run on Windows.** See [section 6](#6-updating-baseline-screenshots-locally) for how to reproduce
the CI environment locally via Docker if you need to debug a diff without pushing.

## 3. Environment variables

**Nothing is required.** Normal local runs and normal CI runs need zero environment variables —
`playwright.config.ts` builds the app and starts `vite preview` on `http://localhost:4173`
automatically, and CI's PR-comment/GitHub Pages steps use the `GITHUB_TOKEN` Actions injects by
default (see sections 7/9).

One optional variable, for a specific edge case: `PLAYWRIGHT_BASE_URL`. Set it only if you want to
point the suite at an already-deployed URL (e.g. a staging deployment) instead of building and
previewing locally:

```bash
# frontend/.env.test (copy from .env.test.example — gitignored, never commit your own)
PLAYWRIGHT_BASE_URL=https://staging.example.com
```

When set, `playwright.config.ts` uses it as `baseURL` directly and skips starting the local
`webServer` entirely (no point building the app locally if you're testing a deployed instance).
Unset (the default) it falls back to `http://localhost:4173`.

No other `.env` files exist or are needed anywhere else in this repo for this feature — the only
other secrets in the repository are the VPS SSH deploy credentials used by the pre-existing
`deploy_release.yaml` workflow, which are completely unrelated to this testing setup.

## 4. Test structure & how to add pages

```
frontend/
  playwright.config.ts
  tests/
    README.md                       # this file
    e2e/
      pages.manifest.ts             # dynamic — ALL real pages, used by a11y.spec.ts only
      visual-fixtures.manifest.ts   # static — curated subset, used by visual.spec.ts only
      utils/theme.ts                # seedTheme(page, "light" | "dark")
      visual.spec.ts
      a11y.spec.ts
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
```

One folder per page (5 folders × 6 files = 30), rather than 30 flat files — much easier to review
"everything about the page this PR touched" at a glance. This comes from passing an **array** as
the name to `toHaveScreenshot()` in `visual.spec.ts` (`[entry.name, \`${theme}.png\`]`) — Playwright
treats array elements as nested path segments, so combined with `snapshotPathTemplate` in
`playwright.config.ts` (`{snapshotDir}/{arg}-{projectName}{ext}`), the viewport (`{projectName}`)
still ends up in the filename while the page name becomes the folder.

**Two separate manifests, on purpose:** `pages.manifest.ts` is *dynamic* — it imports
`@/data/work` and `@/data/journal` directly and derives one entry per page that actually renders
(every `work` item with a `caseStudy`, every `journal` post with a `body`), plus 3 hardcoded
static routes (`/`, `/work`, `/journal`). `visual-fixtures.manifest.ts` is *static* — a
hand-picked list of a few of those same paths, chosen to represent distinct template variants,
and it validates every path it lists still exists in `pages.manifest.ts` (throws a clear error at
import time if not — e.g. if a case study's slug changes).

**Why the split:** accessibility scans are cheap (no images stored, just DOM assertions) so
`pages.manifest.ts` can safely scale to hundreds of future articles/projects with zero added
cost. Screenshots are not cheap (every new page × 2 themes × 3 viewports = 6 new baseline PNGs,
forever, in git history) — testing every single future article visually would provide near-zero
extra signal (it's the same shared page template being re-tested) while bloating the repo. So
visual regression stays pinned to a small, deliberately curated set. See section 11 for why
*masking* the dynamic content areas of `home`/`work-list`/`journal-list` was considered as an
alternative and dropped in favor of the `/update-snapshots` mechanism (section 8).

Neither manifest adds anything to the domain types — `WorkItem`/`JournalPost` in `src/data/*.ts`
have zero knowledge that tests exist. That separation of concerns is intentional and should stay
that way; if you need a different subset of pages for some future test type, create another
manifest file, don't add a flag to the domain model.

### How to add pages

- **New journal post or work case study with the existing template shape:** add it to
  `journal.ts` / `work.ts` as normal (give it a `body`/`caseStudy`). `pages.manifest.ts` picks it
  up automatically — it will get accessibility coverage on the next run, with zero test-code
  changes. It will NOT automatically get visual-regression coverage (see above) — that's
  deliberate. If the visual check on `home`/`work-list`/`journal-list` fails just because your
  new content changed what they render, that's expected — see section 8 to accept it.
- **You want this specific new page visually regression-tested too** (e.g. it uses a new content
  block type, or a layout variant nothing else has): add its path to the `FIXTURE_PATHS` array at
  the top of `tests/e2e/visual-fixtures.manifest.ts`.
- **A brand-new top-level route** (e.g. a future `/about`): add one line to the `staticPages`
  array in `tests/e2e/pages.manifest.ts`. If you also want it visually tested, add it to
  `visual-fixtures.manifest.ts` too.
- **A fixture's underlying content gets renamed/removed:** `visual-fixtures.manifest.ts` throws a
  descriptive error at test-collection time (`npx playwright test --list` will fail loudly) rather
  than silently dropping that page from coverage — update `FIXTURE_PATHS` to point at something
  that still exists.

## 5. Running tests locally

```bash
cd frontend

npm run test:e2e              # everything (visual + a11y, all projects)
npm run test:visual           # only tests/e2e/visual.spec.ts
npm run test:a11y             # only tests/e2e/a11y.spec.ts

npx playwright test --project=Desktop         # only the Desktop viewport project
npx playwright test -g "home @ light"         # only tests whose title matches this string

npx playwright test --headed                  # watch the browser while it runs
npx playwright test --debug                   # step through with the Playwright Inspector
npx playwright test --ui                      # interactive UI mode (recommended for exploring)

npm run test:e2e:report       # opens the last HTML report (or: npx playwright show-report)
```

`--list` (e.g. `npx playwright test --list`) is useful to sanity-check the manifest/fixture logic
without launching a single browser — it prints every resolved test title, and importantly, it's
also what will surface a `visual-fixtures.manifest.ts` "stale fixture" error immediately, since
that check runs at module-import time.

## 6. Updating baseline screenshots locally

```bash
npm run test:e2e:update
# equivalent to: npx playwright test tests/e2e/visual.spec.ts --update-snapshots
```

**Don't commit baselines generated this way on Windows.** As covered in section 2, Windows and
Linux render text with different anti-aliasing, so a Windows-generated baseline will show as a
false diff the moment CI (Ubuntu) runs against it. Three options, in order of preference:

1. **Comment `/update-snapshots` on the PR** (recommended, no local setup at all — see section 8).
2. **Just push to a PR branch and look at the CI-run report** (no local baseline update needed
   either — the PR job's HTML report shows you exactly what changed, actual/expected/diff, side
   by side).
3. **Reproduce the CI environment locally via Docker**, if you specifically want to iterate on a
   diff without pushing anything yet:

   ```bash
   docker run --rm -v "${PWD}:/work" -w /work/frontend \
     mcr.microsoft.com/playwright:v1.61.1-noble \
     npx playwright test tests/e2e/visual.spec.ts --update-snapshots
   ```

   (Match the image tag's Playwright version to `frontend/package.json`'s `@playwright/test`
   version whenever you bump it — see section 10.) This runs the exact same Ubuntu/Chromium
   combination the GitHub Actions runner uses, so the resulting PNGs are safe to commit directly.

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

**Why this exists instead of a master auto-commit:** the original design regenerated baselines on
`master` after merge and committed them directly. That doesn't work here — `master` has a
repository ruleset (PR required, status checks required, CodeQL required) that blocks direct
pushes, including from a bot with `contents: write`. The fix isn't to bypass that (e.g. via a PAT
in the ruleset's allow-list — see the [RESOLVED] note in section 11 for the workaround that was
tried first and abandoned) — it's to never need to push to `master` at all: baselines get
accepted **before** merging, from the PR's own branch, which has no such restriction.

**How to use it:** when a visual check fails and the report shows the diff is just your own
content change (not a real bug), comment exactly:

```
/update-snapshots
```

on the PR. The bot reacts with 👍, then:

1. Checks out the **PR's own branch** (via `gh pr checkout`, not `master`).
2. Regenerates `tests/visual-snapshots/` (`npx playwright test tests/e2e/visual.spec.ts --update-snapshots`)
   in the same Ubuntu/Chromium environment CI uses — no local Docker step needed.
3. Commits and pushes straight to that branch if anything actually changed.
4. Posts a follow-up comment: ✅ if it pushed an update, ℹ️ if there was nothing to update, ❌ with
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
generic failure. See the `[RESOLVED]` entry in section 11 for how this was found.

**Known limitation:** only works for PRs whose branch lives in this repository (not a fork) —
`gh pr checkout` plus a push needs write access to the branch, which a fork's branch doesn't grant
the base repo's `GITHUB_TOKEN`, and the guard above now also refuses to try. Not a concern today
(personal, single-maintainer repo) but this was a real, exploitable gap, not just a theoretical
one, given the repo is public.

## 9. GitHub Pages

Reports are published via
[`peaceiris/actions-gh-pages`](https://github.com/peaceiris/actions-gh-pages), which pushes the
built Playwright HTML report to a `gh-pages` branch, into a subfolder per run
(`reports/pr-<number>/` or `reports/master/`), with `keep_files: true` so older reports from other
PRs aren't wiped out by a newer run.

**One-time manual setup required** (cannot be done via a commit — this is a repository setting):

1. Go to the repo on GitHub → **Settings → Pages**.
2. Under "Build and deployment" → **Source**, choose **Deploy from a branch**.
3. Branch: **`gh-pages`**, folder: **`/ (root)`**. Save.
4. The `gh-pages` branch itself doesn't need to exist beforehand — `peaceiris/actions-gh-pages`
   creates it automatically on the first workflow run if it's missing.

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

### Versions installed initially

- `@playwright/test`: `1.61.1`
- `@axe-core/playwright`: `4.12.1`

Installed with:

```bash
cd frontend
npm install --save-dev @playwright/test@1.61.1 @axe-core/playwright@4.12.1
```

### How to bump these later

1. Check the current vs latest version: `npm view @playwright/test version` /
   `npm view @axe-core/playwright version`.
2. Read the Playwright release notes for the versions between what you have and the target,
   specifically for: changes to `toHaveScreenshot` defaults, changes to built-in `devices[]`
   presets (device names/viewports occasionally get added or renamed — this bit us once, see
   [section 11](#11-known-issues--notes)), and changes to the HTML/GitHub reporters.
3. Bump in `frontend/package.json`, then run `npm install` (or `npm update @playwright/test
   @axe-core/playwright`) to refresh `package-lock.json`.
4. **Re-run `npx playwright install chromium`** after bumping `@playwright/test` — the npm
   package version and the downloaded browser binary version are coupled; an out-of-sync browser
   binary is the most common source of "works locally, fails in CI" (or vice versa) after a
   dependency bump.
5. Because baselines are pixel comparisons, a Chromium version bump can shift anti-aliasing
   subtly even with no code change — expect to possibly need one `--update-snapshots` run
   accepted via a PR (per [section 8](#8-accepting-new-baselines-from-a-pr-update-snapshots))
   right after a Playwright upgrade, and treat that particular baseline diff as "expected churn
   from the upgrade", not a real regression.
6. Also bump the Node version in `.github/workflows/visual-tests.yml` (`node-version: 20`) if you
   want to track a newer Node LTS — keep it in sync with `deploy_release.yaml` unless you have a
   specific reason to diverge.

## 11. Known issues & notes

_(Living section — append a new entry every time a real problem is hit during setup or later
maintenance. Do not delete old entries even if they're later fixed elsewhere — mark them
resolved instead, so the history of "what bit us" is preserved.)_

### [RESOLVED] `toHaveScreenshot(name)` requires the `.png` extension in the name

First draft called `expect(page).toHaveScreenshot(\`${entry.name}-${theme}\`, ...)` (no
extension). Playwright throws `Screenshot name "..." must have '.png' extension` — the string
overload of `toHaveScreenshot` expects the extension as part of the name; it's not appended
automatically even though `snapshotPathTemplate` also has an `{ext}` placeholder. Fixed by
appending `.png` explicitly in `visual.spec.ts`.

### [RESOLVED] Apple device presets (`devices["iPad (gen 7)"]`, `devices["iPhone 13"]`) default to WebKit, not Chromium

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
tablet/mobile-shaped viewports while staying on Chromium:

```ts
use: { ...
    devices["Desktop Chrome"], viewport
:
    {
        width: 390, height
    :
        844
    }
,
    isMobile: true, hasTouch
:
    true
}
,
```

**Takeaway for later:** if multi-browser (WebKit/Firefox) support is ever added, remember to run
`npx playwright install` for those engines too, and re-evaluate whether the Apple presets should
be used as-is at that point (they'd then make sense, since a real WebKit binary would exist).

### Real, pre-existing accessibility violations found by `a11y.spec.ts`

The first real run against the actual site (before any test-code bugs were fixed) surfaced
genuine, site-wide `color-contrast` (WCAG "serious") violations — not test bugs. Confirmed
visually: the footer copyright line and various "faint"/muted labels are legitimately hard to
read against the near-black background in the exported screenshots.

- Rule: `color-contrast` (WCAG 2 AA, `wcag143`), impact `serious`.
- Affected token/classes seen across pages: `.text-text-faint` (footer copyright, ledger year
  columns, date labels), status badges (`.text-status-warning`/`.text-status-success` on their
  tint backgrounds), `.text-accent-solid`.
- Where: on **every** page tested, in **both** light and dark theme — this is a design-token
  issue (`neutral.dim` in `src/shared/ui/theme/tokens.ts`, wired to `--color-text-faint`), not a
  page-specific bug.
- Also found once: `scrollable-region-focusable` (serious) — a horizontally-scrollable region
  (likely a `CodeBlock`) that isn't reachable/operable via keyboard.

This is a real finding the new tooling is supposed to surface (accessibility was requirement #3
of the original ask) — it is being tracked and handled explicitly, see the decision recorded in
the implementation log below rather than silently patched or hidden.

### The accent/status color fix — full story (three attempts, two rejected)

This is the single biggest detour of the whole implementation, worth recording in detail because
the *reasoning* about why two fixes were rejected matters more than the final diff.

**Attempt 1 — rejected: darken `palette.accent`/`statusGreen`/`statusAmber` globally.**
Scaled every channel of the vibrant orange/green/amber down uniformly (in linear sRGB) until the
worst-case contrast ratio cleared 4.5:1. Numerically correct (see the ratios above), but visually
wrong: darkening a saturated orange this much makes it look muddy/brown, not "a deeper orange" —
warm hues lose their vibrancy fast as lightness drops, and the result read as "someone spilled
coffee on the buttons" (direct quote from the review). Reverted immediately, before it was ever
looked at from a testing/CI angle — the lesson here is **generate a real visual preview (a
screenshot or an isolated swatch page) before applying any color-token change, never just trust
the contrast-ratio math.**

**Attempt 2 — accepted, partial: `accent.onSolid` / `status.onSolid` (dark ink on solid fill).**
The actual root cause was that a single token (`accent.solid` / `status.success` / `status.warning`)
was being reused for two incompatible roles:

- as a **background fill** (buttons, `StatusBadge` pills, dots, `ProgressBar`) — must stay vibrant,
- as the **foreground text color** drawn on a pale ~12%-opacity tint of the same color (the old
  `StatusBadge` style) — this is what actually failed contrast (ratio 1.5-2.6 against light-theme
  tints).

Fix: keep the vibrant fill untouched everywhere, and redesign `StatusBadge` from "pale tint +
colored text" to "solid fill + dark ink text", reusing the site's own dark-theme near-black
(`darkPalette.bg`, `#0b0b0d`) as the ink color — added as `accent.onSolid` / `status.onSolid`
(→ CSS vars `--color-accent-on-solid` / `--color-status-on-solid` → Tailwind `text-accent-on-solid`
/ `text-status-on-solid`). Dark ink clears **7.5:1** on the orange, **10.4:1** on amber, **11.3:1**
on green — huge margins, and it's the *same* ink color in both site themes since the fill itself
is theme-invariant. Applied to:

- `Button.tsx` primary variant (`text-text-inverse` → `text-accent-on-solid`) — fixes the
  `.h-14` CTA-button violation.
- `StatusBadge.tsx` — all three colored tones (`success`/`warning`/`accent`) switched from
  `bg-*-tint-bg` + colored text to `bg-*` (solid) + `text-*-on-solid`; `dotClasses` updated the
  same way so the small pulsing dot (nav "AVAILABLE FOR PROJECTS" badge) stays visible against the
  now-solid pill instead of blending into it.
- This was previewed as an isolated HTML swatch *and* as real screenshots of the actual site
  before being accepted — see the note above about not trusting the math alone.

**Attempt 3 — accepted: `accent.text` (a third, theme-aware role for plain inline text).**
Even after attempt 2, 6 violations remained, all on **plain accent-colored text with no fill
behind it at all**: the global `a { color: var(--color-accent-solid) }` link rule, `Eyebrow`
(`tone="accent"`), `Text` (`tone="aurora"`), `IconBadge` (`accent` tone), and the case-study
"approach" step titles on `WorkDetailPage`. There is no background here to put dark ink on — the
`onSolid` trick from attempt 2 fundamentally does not apply. For this role the color itself has to
change on the light theme (there is no way around it — this was verified numerically with an
OKLCH-based search across dozens of candidate lightness/chroma values: every value that clears
4.5:1 against a near-white background inevitably reads as "burnt orange/rust", not "orange" —
that's a hard perceptual limit of the hue, not a fixable calculation). Added `accent.text`
(dark theme: identical to `accent.solid`, unchanged; light theme: `#be3500`, chosen as the
*minimal* darkening that still clears every real background it appears on — ratio ~4.66-5.7 vs.
the page background, white cards, and the accent tint) and repointed every one of those five call
sites at `text-accent-text` instead of `text-accent-solid`. This was previewed in-context (actual
site screenshots of the hero "SYSTEMS ENGINEER" label, the "Case study →" link, and the
"CASE STUDY" eyebrow) before being accepted, and reads as a subtle, still-clearly-orange shift at
the small text sizes it's used at.

**Net result:** three distinct semantic roles now exist where there used to be one ambiguous
token — `*.solid` (fill), `*.onSolid` (text/dot on a solid fill of the same color), `accent.text`
(plain inline text with no fill). `WorkItem`/`JournalPost` were never touched by any of this — it
lives entirely in `src/shared/ui/theme/tokens.ts` and the handful of components that consume it.

### `toHaveScreenshot`/test timeouts under Docker resource constraints

While generating the initial baselines inside the official `mcr.microsoft.com/playwright` Docker
image (see section 12), 5 of 30 tests failed with `Timeout 5000ms exceeded` on the screenshot
stability check, and later 2 more failed with `Test timeout of 30000ms exceeded` on the heavier
`home` page (hero gradient/glow background). Root cause: Playwright retries capturing a
screenshot until two consecutive captures are pixel-identical (to avoid catching mid-animation
frames), and a CPU-throttled container running 8 parallel workers just needed more wall-clock time
for that to settle — not a real bug in the app or the tests. Fixed by raising both timeouts in
`playwright.config.ts`: `expect.toHaveScreenshot.timeout` from the 5s default to `15_000`, and the
top-level test `timeout` from the 30s default to `60_000`. Since GitHub Actions runners are
similarly modest (2 vCPU), these higher timeouts are kept for real CI too, not just local Docker
runs.

### `heading-order` (moderate) on the landing page — tracked, not blocking

The very first full CI-equivalent run found one non-blocking (`moderate` impact, below this
suite's `critical`/`serious` failure threshold — see `BLOCKING_IMPACTS` in `a11y.spec.ts`) finding:
`heading-order` — "Heading levels should only increase by one" — on the home page, in both
themes. This is exactly what the moderate/minor-violations-are-reported-not-blocking design is
for (see the "Report contents" discussion in the original plan): it shows up in
`test-results/summary.json`'s `a11yViolationCount` and would show up in the PR comment, but
doesn't fail the build. Not fixed as part of this task (out of scope — it's a genuine, pre-existing
heading-hierarchy issue on the landing page worth a small follow-up, but not a testing-infra
concern); left here so it isn't forgotten.

### `opacity-45` on the "upcoming" journal entry (also fixed)

Separately, the unpublished "Notes from the Camera Pipeline — draft" entry wrapped its *entire*
block (already-AA-compliant text) in `opacity-45`, which re-introduces exactly the contrast
problem the token fixes above just solved — `opacity` blends every pixel toward the page
background, and a numeric search showed the opacity would need to go from `0.45` to **~0.84-0.94**
to stay above 4.5:1, which is indistinguishable from full opacity and defeats the point of dimming
it. Fixed by dropping the `opacity-45` wrapper entirely in `JournalListPage.tsx` and instead
relying on the tone system that was already there: title uses `text-text-muted` (was already
conditional on `!isPublished`), excerpt now uses `tone="faint"` instead of `tone="muted"` when
unpublished. Both tones are already independently AA-compliant at full opacity, so this can't
regress the same way again.

### [RESOLVED] The "upcoming" entry title stopped visually de-emphasizing after the `opacity-45` fix

Caught by the user reviewing an actual screenshot, not by any test: after the `opacity-45` fix
above, the unpublished entry's title ("Notes from the Camera Pipeline — draft") rendered at full
brightness — visually indistinguishable from a real published post's title, defeating the entire
point of "upcoming" looking de-emphasized (this was the original UX intent the `opacity-45` hack
existed for in the first place).

Root cause, pre-existing (not introduced by the `opacity-45` removal, just exposed by it): the
title was `<Text variant="h3" className={cn("...", !isPublished && "text-text-muted")}>` — no
`tone` prop, so `Text` defaults to `tone="primary"`, which adds `text-text-primary` via its own
internal `toneClasses` lookup. That class and the manually-appended `text-text-muted` both landed
in the className string at the same specificity — **which one visually wins depends on the order
Tailwind emits them in the generated stylesheet, not on their order in the className string.**
This is a fragile pattern in general (any time you override a component's own tone/variant output
by appending a same-specificity utility class rather than using the prop the component exposes for
that exact purpose), and it silently flipped outcomes at some point after other, unrelated `@theme`
color variables were added earlier in this same implementation.

Fix: use the `tone` prop the `Text` component already provides instead of fighting its output —
`<Text variant="h3" tone={isPublished ? "primary" : "muted"} className="...">`. Only one tone class
is ever emitted now, so there's no ordering ambiguity to regress on. **Takeaway:** never override a
design-system component's color via a raw same-specificity utility class in `className` when the
component exposes a prop for that; it may work by accident today and silently flip later.

### [RESOLVED] Master's baseline auto-commit silently failed — `master` has a protected-push ruleset

Discovered via the GitHub API (job step logs), not from a failing check that was obviously red —
the master run itself looked green-ish (report published, PR comment posted, etc.) but the
"Commit updated baselines" step had `conclusion: "failure"` buried in the job's step list, and no
`github-actions[bot]` commit ever actually appeared on `master`. Root cause: `master` has a
repository ruleset (pull request required, status checks required, CodeQL required) that blocks
direct pushes — including from `stefanzweifel/git-auto-commit-action` running with the default
`GITHUB_TOKEN` and `contents: write`, since branch-protection rulesets take precedence over what
a workflow's own `permissions:` block grants.

**First attempt (tried, then abandoned):** work around it with a bypass-listed PAT instead of
`GITHUB_TOKEN`:

1. **Settings → Developer settings → Personal access tokens** — create a token (fine-grained,
   scoped to just this repo, with **Contents: Read and write**).
2. **Settings → Secrets and variables → Actions** — add it as a repository secret named
   `BASELINE_COMMIT_PAT`.
3. **Settings → Rules → Rulesets** — open the ruleset covering `master`, and in **Bypass list**
   add **Repository admin**, set to **Always allow**.
4. Use that secret as the `token:` input on the workflow's checkout step instead of
   `GITHUB_TOKEN`, falling back to `GITHUB_TOKEN` when the secret isn't set.

This does work (the bypass-list entry is what actually lets the push through; the PAT is just how
the workflow proves it's an account holding that role) — but it's the wrong fix. It keeps the
fundamental design flaw (a bot trying to push straight to a protected branch) and just punches a
hole in the protection for it, plus it needs an extra secret and a ruleset exception that has to
be remembered/maintained. Replaced entirely with the architecture in section 8: baselines are
accepted **before** merge, from the PR branch (via `/update-snapshots`, a new comment-triggered
workflow), so `master` never needs to accept a direct push for this at all. `visual-tests.yml`'s
`master` job now runs in plain compare-only mode, identical to the `pull_request` job — no more
`--update-snapshots`, no more auto-commit step, no more PAT, no more bypass-list entry needed.

### [RESOLVED] Bare GitHub Pages root (`.../Portfolio-Website/`) 404s — permanently, not a delay

Different from the transient "brand-new PR report path" propagation delay noted elsewhere in
this section: the `gh-pages` branch only ever gets written to under `reports/<dest>/`
(`destination_dir` in the workflow) — nothing publishes an `index.html` at the actual branch
root, confirmed with `git ls-tree origin/gh-pages` (only `.nojekyll` and `reports/` at the top
level). Visiting the bare Pages URL therefore 404s **forever**, not just for a minute after a
fresh deploy — there's simply nothing there to serve, ever, until something publishes to that
path.

Fixed by adding a second, small `peaceiris/actions-gh-pages` step to the workflow that publishes
a one-page static landing page (generated by `.github/scripts/generate-pages-index.mjs`, linking
to `reports/master/` and explaining where PR reports live) straight to the branch root (no
`destination_dir`), with `keep_files: true` so it doesn't wipe the `reports/` folder written by
the other publish step in the same job.

### [RESOLVED] `/update-snapshots` had a "pwn request" vulnerability — trusted commenter, untrusted code

Flagged by an automated code-review comment on the PR (not caught during initial implementation
or manual testing) — a genuinely serious finding, not a nitpick. The workflow's only guard was
`github.event.comment.author_association` (who posted the comment), which says nothing about
whose code is checked out and executed. Concretely: `gh pr checkout` fetches the PR's own branch,
then `npm ci` and `npx playwright test --update-snapshots` execute that branch's own
`postinstall` scripts / `playwright.config.ts` / test files — all while the job still holds a
`contents: write` token (needed for the later `git push`). A trusted maintainer commenting
`/update-snapshots` on what looks like an innocent content-only PR from a malicious fork would
unknowingly hand that fork's code push-capable credentials. This is a well-documented class of
GitHub Actions vulnerability (often called a "pwn request"), not something specific to this repo
— but it was a real, exploitable gap here given the repo is public, not just a theoretical one.

Fixed with a `head.repo.full_name` check against the PR via the API, run *before* any checkout of
PR content, that fails the job closed if the PR's branch isn't in this repository (i.e. is a
fork) — see the updated section 8 above for the exact mechanics. Deliberately did **not** go with
the reviewer's other suggested option (run the untrusted code in a separate job stripped of
write-scoped credentials, then use a second, privileged job only to commit the already-produced
output) — that's a more elaborate defense-in-depth pattern worth reconsidering if this repo ever
accepts external contributions, but the fork guard alone fully closes the specific attack
described here, and is far simpler to reason about for a personal, single-maintainer repo.

### [RESOLVED] First real `/update-snapshots` run failed — mangled `Checkout` step + a template-literal bug

Two separate, unrelated bugs, both found from a single real run (triggered from an actual PR
comment) rather than caught during review:

1. **The `Checkout` step got mangled during a merge.** After the fork-guard security fix landed
   on its own branch and was later merged together with an unrelated large PR (the Next.js
   migration) that had *also* touched this same file, the merged result on `master` had a
   `Checkout` step whose `uses:` pointed at `actions/setup-node@v4` (with Node version/cache
   inputs) instead of `actions/checkout@v4` — and the separate `Checkout PR branch` (`gh pr
   checkout ...`) and `Setup Node` steps had vanished entirely, apparently swallowed by the same
   bad merge-conflict resolution. Confirmed by diffing
   `git show origin/master:.github/workflows/accept-visual-baselines.yml`
   against what this file should contain — the job never actually checked out the repository
   before trying to `npm ci` inside `frontend/`, which doesn't exist without a checkout. Fixed by
   restoring the three steps as distinct entries: `Checkout` (`actions/checkout@v4`, no inputs),
   `Checkout PR branch` (`gh pr checkout`), `Setup Node` (`actions/setup-node@v4`).
2. **The failure-comment URL was a JS template-literal bug, not a GitHub issue.** The failure
   branch built the workflow-run link with `"${context.serverUrl}/${context.repo.owner}/..."` —
   **double-quoted**, not backtick-delimited. `${...}` interpolation only happens inside
   backtick template literals in JavaScript; inside a regular string it's inserted completely
   literally. The posted PR comment therefore linked to the literal text
   `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
   which GitHub tried to parse as a repo-relative path and rendered as a nonsensical branch-compare
   page ("There isn't anything to compare"). Fixed by switching that branch to an actual template
   literal (`` `${context.serverUrl}/...` ``) and building the URL as its own variable first.

**Takeaway:** embedded `script: |` blocks in a workflow YAML are opaque strings to the YAML
parser — `js-yaml`/YAML validation (used throughout this implementation to sanity-check syntax)
catches YAML structure problems, but says nothing about the JavaScript *inside* those blocks.
Neither bug here was a YAML problem; both were JS logic bugs that only surfaced by actually
triggering the workflow for real.

### Design change: content-driven visual diffs are accepted via PR comment, not avoided

Initially considered (and asked about explicitly): masking the "living" content areas of
`home`/`work-list`/`journal-list` (the featured-work grid, the journal preview, the full
ledgers) with Playwright's `mask` option, so adding a new work item or journal post would never
trigger an "expected" visual diff on those pages in the first place. Superseded by the
`/update-snapshots` mechanism in section 8 before being implemented (a brief, incomplete
`data-visual-mask` attribute landed in `WorkListPage.tsx` mid-exploration and was reverted): that
mechanism solves the actual underlying friction (visual checks failing on legitimate content
changes, with no easy way to move past it) more generally — it also covers genuine template/design
changes on those same pages, which masking never would have. Revisit masking later only if
`/update-snapshots` itself turns out to be too much friction for routine content updates in
practice.

## 12. Implementation log

_(Living, append-only. One entry per small implementation step: date, what was done, which files
changed, what didn't work and how it was fixed.)_

### 2026-07-17 — Guide skeleton created

Created this file with all 12 sections as placeholders. No code changes yet. Next step: add
`@playwright/test` and `@axe-core/playwright` as dev dependencies.

### 2026-07-17 — Dependencies, Playwright config, manifests, specs

- Installed `@playwright/test@1.61.1` and `@axe-core/playwright@4.12.1` as dev dependencies;
  installed the Chromium browser binary only (`npx playwright install chromium`).
- Added npm scripts: `test:e2e`, `test:visual`, `test:a11y`, `test:e2e:update`, `test:e2e:report`.
- Created `playwright.config.ts`: 3 projects (Desktop/Tablet/Mobile, all Chromium-based —
  see the known-issue below about why Apple device presets were avoided), `snapshotDir`/
  `snapshotPathTemplate` pointing at `tests/visual-snapshots/`, `webServer` that builds+previews
  the app unless `PLAYWRIGHT_BASE_URL` is set.
- Created `tests/e2e/pages.manifest.ts` (dynamic, derives every real page from `@/data/work` /
  `@/data/journal`) and `tests/e2e/visual-fixtures.manifest.ts` (static, hand-picked subset,
  validated against the dynamic manifest at import time).
- Created `tests/e2e/utils/theme.ts` (`seedTheme`) and the two spec files
  (`visual.spec.ts`, `a11y.spec.ts`).
- Created `tests/e2e/reporters/summary-reporter.ts`.
- Fixed two real implementation bugs found while running the suite for the first time (see
  section 11): the `.png` extension on `toHaveScreenshot()` names, and the WebKit-vs-Chromium
  device preset issue.
- Ran the suite against the real site for the first time and found genuine, pre-existing
  accessibility issues (not test bugs) — see the "accent/status color fix" story in section 11
  for the full investigation and the three attempts (one rejected, two accepted) it took to
  resolve them properly, plus the separate `opacity-45` fix on the journal list page.
- End state: all 10 `a11y.spec.ts` tests pass (5 pages × light/dark); all 30 `visual.spec.ts`
  tests run cleanly end-to-end (no baselines committed yet on purpose — see section 6/12 below,
  those get generated from Linux, not from this Windows dev machine).

### 2026-07-17 — CI workflow, GitHub Pages publishing, initial baselines

- Created `.github/workflows/visual-tests.yml` (single `test` job, branches on
  `pull_request`/`push` event type — see section 7) and `.github/scripts/format-summary.mjs`
  (turns `test-results/summary.json` into the PR comment body).
- Chose `peaceiris/actions-gh-pages` (branch-based deploy, supports incremental per-run
  subfolders via `destination_dir`/`keep_files`) over the newer Pages-via-Actions-artifact
  mechanism, specifically because the latter replaces the whole site on every deploy and can't
  easily keep multiple PRs' reports side by side — see section 9 for the one-time repo Settings
  step this requires.
- Updated `frontend/.gitignore` (`/test-results/`, `/playwright-report/`, `/blob-report/`,
  `/playwright/.cache/`, `.env.test` — explicitly NOT `tests/visual-snapshots/`) and added
  `frontend/.env.test.example`.
- Generated the actual initial baselines using the official `mcr.microsoft.com/playwright:v1.61.1-noble`
  Docker image (matching the exact `@playwright/test` version installed), with `-e CI=true` so the
  run also matched CI's worker count/retry policy exactly, not just its OS/Chromium build. Command
  used (see section 6 for the general form):

  ```bash
  docker run --rm -e CI=true \
    -v "E:\Projects\Portfolio-Website:/work" -v /work/frontend/node_modules \
    -w /work/frontend mcr.microsoft.com/playwright:v1.61.1-noble \
    bash -c "npm ci && npx playwright test tests/e2e/visual.spec.ts --update-snapshots"
  ```

  (The second `-v /work/frontend/node_modules`, with no host path, mounts an anonymous
  container-local volume over that path — necessary because `node_modules` built on Windows
  contains Windows-native binaries (`esbuild`, `rollup`) that silently fail inside a Linux
  container if reused directly from a bind-mount; `npm ci` re-populates it with Linux binaries
  instead, without touching the real Windows `node_modules` on the host.)
- Hit two timeout issues during this run (both fixed in `playwright.config.ts`, see section 11)
  and confirmed the fix with a second Docker run.
- Ran the **full** suite (`npx playwright test`, no `--update-snapshots`) one more time in the
  same container against the freshly-committed baselines as a final sanity check: **40/40 passed**
  (30 visual + 10 a11y), with one non-blocking `moderate` finding recorded (see section 11).
- All 30 PNGs under `frontend/tests/visual-snapshots/` are now the real, committed baseline —
  generated from Linux, safe to compare against in CI.

### 2026-07-17 — Baselines reorganized into one folder per page

Switched `visual.spec.ts` from a flat screenshot name (`${entry.name}-${theme}.png`, producing 30
files in a single folder) to an array name (`[entry.name, \`${theme}.png\`]`), which Playwright
turns into nested folders — verified with one test first (`tests/visual-snapshots/home/light-Desktop.png`)
before wiping and regenerating all 30 baselines via the same Docker command as before. Final
layout: 5 folders (one per page), 6 files each (2 themes × 3 viewports) — see section 4. Re-ran
the full suite in the same container afterward: 40/40 passed again, no regressions from the
restructure.

### 2026-07-17 — Real UX bug caught from a screenshot: "upcoming" entry not visually de-emphasized

User spotted this from an actual rendered screenshot (not from a failing test — this doesn't
violate any WCAG rule, it's a design intent regression): the unpublished journal entry's title
should look clearly grayed-out/de-emphasized so it doesn't blend in with real posts, and after the
`opacity-45` removal (previous log entry) it no longer did. Root cause and fix: see the
`[RESOLVED]` entry in section 11 — a `Text` component tone/className specificity conflict that
had likely been silently broken (or silently working "by luck" of generation order) for a while.
Fixed `JournalListPage.tsx` to pass `tone={isPublished ? "primary" : "muted"}` instead of a
manual `className` override. Regenerated the `journal-list/` baselines (only) via Docker,
confirmed visually against the same screenshot the user flagged, then re-ran the full suite:
40/40 passed.

### 2026-07-18 — First real PR/master run surfaced two more bugs, plus a bigger architecture change

- **Report 404 (transient, not a bug):** a PR's first-ever report at `reports/pr-<N>/` briefly
  404'd right after the check finished — confirmed via a live re-fetch minutes later that it was
  just GitHub Pages' normal build/propagation lag for a brand-new path, not a broken publish.
- **Master's baseline auto-commit was actually failing** (see the `[RESOLVED]` entry in section
    11) — found via the GitHub API (`.../actions/runs/<id>/jobs`), which showed the "Commit updated
        baselines" step with `conclusion: "failure"` even though the overall run "looked" mostly fine.
        Root cause: a repository ruleset on `master` (PR required, status checks required, CodeQL
        required) blocks direct pushes from anything, including a bot with `contents: write`.
- Discussed the actual workflow the user wants: open a PR, see a visual check fail because page
  content changed (not a bug), explicitly accept that, and have it land without a second
  master-side build. Redesigned around that instead of patching the master auto-commit:
    - Simplified `visual-tests.yml`: removed `--update-snapshots`/the auto-commit step entirely;
      `master` now runs the exact same compare-only check as `pull_request`.
    - Added `.github/workflows/accept-visual-baselines.yml`, a new `issue_comment`-triggered
      workflow: `/update-snapshots` on a PR checks out that PR's branch (`gh pr checkout`),
      regenerates baselines, and pushes straight to it — never touching `master` — restricted to
      `OWNER`/`MEMBER`/`COLLABORATOR` commenters only.
    - Considered masking the dynamic content areas of `home`/`work-list`/`journal-list` first (a
      stray, incomplete `data-visual-mask` attribute briefly landed in `WorkListPage.tsx` from this
      exploration) — dropped in favor of `/update-snapshots`, which solves the same friction more
      generally; reverted that attribute.
- Also fixed the permanent (non-transient) bare-Pages-root 404 — see the `[RESOLVED]` entry in
  section 11 — by publishing a small landing page via `.github/scripts/generate-pages-index.mjs`.
- **File relocated:** this document moved from `VISUAL_TESTING_GUIDE.md` at the repo root to
  `frontend/tests/README.md` (user's call — keeps it next to the tests it documents rather than
  competing with the repo's own top-level README). Updated every cross-reference in
  `.github/workflows/*.yml` and `.github/scripts/*.mjs` to the new path/relative depth.

### 2026-07-18 — Security review caught a real "pwn request" gap; first live run then caught two more bugs

- An automated code-review comment on the CI-fix PR correctly flagged that the workflow's
  `author_association` check only vets the *commenter*, not the *code about to run* — see the
  `[RESOLVED]` entry in section 11 for the full explanation. Added a "Verify the PR branch is not
  from a fork" step (`actions/github-script`, checks `head.repo.full_name` via the API) that runs
  *before* any PR content is checked out, failing the job closed for fork PRs.
- First real trigger of `/update-snapshots` on an actual PR comment failed. Root-caused via
  `git show origin/master:.github/workflows/accept-visual-baselines.yml` (comparing what's
  actually deployed against what the file should contain) rather than guessing: (1) the
  `Checkout` step had been mangled into `actions/setup-node@v4` during a merge with an unrelated
  PR that touched the same file, losing the real `Checkout`/`Checkout PR branch`/`Setup Node`
  steps entirely — restored them as three distinct steps; (2) the failure-comment's workflow-run
  link used double-quoted string concatenation instead of a template literal, so `${...}` never
  interpolated and the literal placeholder text got posted as a broken link — fixed by using an
  actual backtick template literal. Neither bug was catchable by YAML validation (`js-yaml`),
  since embedded `script: |` blocks are opaque strings to a YAML parser — both only surfaced by
  triggering the workflow for real. See section 11 for the full writeup of both.
- Did not commit or push any of this — all fixes in this entry were applied as local file edits
  only, at the user's explicit request after an earlier boundary-crossing (branches/commits were
  pushed without asking first, which should not have happened).
