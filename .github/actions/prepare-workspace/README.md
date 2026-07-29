# `.github/actions/prepare-workspace` — one install/prepare recipe, not three

## What needed doing

Three CI workflows (`visual-tests.yml`, `accept-visual-baselines.yml`,
`backend-web-checks.yml`) each hand-copied the same "set up Node, `npm ci`,
`prisma migrate deploy`" sequence. Twice in one week that copy-paste drifted
out of sync and broke a real CI run:

1. `web/` → `frontend/` rename was applied to 2 of the 3 files; the 3rd
   (`backend-web-checks.yml`) kept `working-directory: web` and failed with
   "no such file or directory" the next time it actually ran.
2. A GitHub Copilot/CodeQL Autofix added `--ignore-scripts` to exactly one of
   the three near-identical `npm ci` steps (`accept-visual-baselines.yml`),
   silently skipping backend's `postinstall` (`prisma generate`). The next
   real run of that workflow failed with `Cannot find module
   '.prisma/client/default'` — a working Prisma client existed in the other
   two workflows the whole time, just not this one.

Neither was a one-off mistake — both are the same underlying failure mode:
one recipe, three independently-editable copies, no way to change it once.

## What was done instead

Extracted the actually-identical part (Node setup + `npm ci` + migrate) into
this composite action, parameterized only by `node-version` (which
legitimately differs: `backend-web-checks.yml` needs 22 for
`@stryker-mutator/vitest-runner`, the other two use 20). Playwright's browser
install is a **separate** composite action
(`.github/actions/setup-playwright`), not folded into this one, since
`backend-web-checks.yml` never runs Playwright at all — no reason to make it
depend on a step it doesn't need.

**Why `Checkout` stays outside this action, in every calling workflow, and
was never a candidate for consolidation:** a local composite action
(`uses: ./path`) can only run once its own `action.yml` is already present on
the runner's disk — which requires the calling workflow to have already
checked out the repository. A composite action can't check itself out before
it exists. `Checkout` also genuinely differs between call sites (a plain
checkout of the triggering ref in two workflows vs. an immutable pinned SHA
in `accept-visual-baselines.yml`, for TOCTOU reasons — see that workflow's
own top comment), so this isn't a loss; it was never actually shareable.

**Why `services:`/`env:` blocks (the Postgres container, `DATABASE_URL`/
`JWT_*`) stay duplicated too:** both are job-level YAML, not steps — a
composite action can only contribute steps to the calling job, it cannot
declare or modify that job's `services`/`env`/`permissions`. Consolidating
those would need a full reusable workflow (`workflow_call`), which runs as
its own isolated job on a fresh runner — useless here, since the whole point
is sharing steps *within* the same job that later runs the actual tests. This
duplication is an accepted, deliberate trade-off, not an oversight: these
blocks are fixed configuration that essentially never changes, unlike the
install/build commands that have already drifted twice.

## Fault tolerance / migration

No data involved. If a future Node/npm/Prisma CLI change needs a different
flag, it changes in exactly one file now, and every workflow that calls this
action picks it up automatically on its next run — the entire class of bug
this action was created to close.

## SOLID

Single Responsibility: this action knows exactly one thing — "how this repo
prepares its workspace for CI" — and nothing about Playwright, Postgres, or
what any given workflow actually tests. Don't Repeat Yourself, applied at the
one place it was actually being violated (not extracted preemptively —
`Checkout` and the `services:`/`env:` blocks were checked and found to be
either impossible or not worth sharing, per the two sections above).
