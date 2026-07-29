# `.github/actions/setup-playwright` — Playwright browser install, kept separate from `prepare-workspace`

## What needed doing

`visual-tests.yml` and `accept-visual-baselines.yml` both need Playwright's Chromium browser
installed; `backend-web-checks.yml` never runs Playwright at all.

## What was done

A second, separate composite action instead of folding this into `prepare-workspace` (even though
that would have been one file fewer) — `backend-web-checks.yml` would then depend on a step it has
no use for, and any future change to Playwright's install step (a new browser, a flag) would touch
a file that a workflow with nothing to do with Playwright also calls. One action, one reason to
change.

## SOLID

Single Responsibility, same reasoning as `prepare-workspace`'s own README: this action knows
exactly one thing (install Playwright's browser binaries for `frontend/`) and nothing about Node
versions, `npm ci`, or migrations — callers that need both compose the two actions as separate
steps rather than one action trying to cover every workflow's needs.
