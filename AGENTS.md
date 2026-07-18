# AGENTS.md

## Cursor Cloud specific instructions

This repository is a single frontend app (React 19 + Vite + TypeScript personal portfolio) living in `frontend/`. There is no backend. Package manager is **npm** (`frontend/package-lock.json`); Node 20+ is expected (Node 22 works). All commands below run from `frontend/`.

### Services / commands
Standard scripts live in `frontend/package.json`:
- Dev server: `npm run dev` — Vite serves on `http://localhost:5173`.
- Lint/typecheck + build: `npm run build` (runs `tsc -b` then `vite build`). There is no separate `lint` script; `tsc -b` is the type-check gate.
- Preview a production build: `npm run preview` (Vite preview on port 4173).
- E2E tests: `npm run test:e2e` (visual + a11y), `npm run test:a11y`, `npm run test:visual`. See `frontend/tests/README.md` for the full testing runbook.

### Non-obvious gotchas
- **Playwright browsers are not covered by `npm ci`.** The update script installs Chromium (`npx playwright install --with-deps chromium`); if e2e commands fail with "Executable doesn't exist", re-run that. Only Chromium is used — Firefox/WebKit are intentionally not installed.
- **Visual regression tests (`test:visual`, and the visual half of `test:e2e`) will fail when run directly on the VM.** Baseline PNGs in `frontend/tests/visual-snapshots/` are generated exclusively in the pinned CI Docker image `mcr.microsoft.com/playwright:v1.61.1-noble`. Web-font metrics/anti-aliasing render differently outside that image, producing large false pixel diffs (e.g. page height differs) even though the app is correct. This is expected — do not "fix" the app or regenerate baselines from the VM. To reproduce/update baselines faithfully, run inside that Docker image (see `frontend/tests/README.md` §6). The **a11y suite (`npm run test:a11y`) is environment-independent and does pass** on the VM — use it as the functional e2e signal.
- The Playwright `webServer` auto-runs `npm run build && npm run preview` on port 4173; set `PLAYWRIGHT_BASE_URL` to target a deployed URL instead (skips the local server).
- Deploy/CI (`.github/workflows/`) targets GitHub Pages reports + a VPS via SSH secrets; unrelated to local development.
