#!/usr/bin/env bash
# Creates the directory layout for the new Next.js app, parallel to the
# existing /srv/apps/yuriisoft (frontend/ static site) — that directory is
# untouched, the site keeps serving from there until the Phase 6 cutover
# step.
#
#   /srv/apps/yuriisoft-web/releases/  — one new timestamped folder per
#     deploy (owned by the deploy user, "yuriisoft" — same account that
#     already unpacks frontend releases today).
#   /srv/apps/yuriisoft-web/shared/    — the ONE thing that survives every
#     release: backend/.env (DATABASE_URL, JWT secrets). Owned by
#     "nextapp", mode 700, so it's unreadable to every other account,
#     including the deploy user itself (deploy.sh has to use sudo to touch
#     it — see 06-app-env.sh).
#
# Idempotent: `mkdir -p`/`chown`/`chmod` are naturally safe to re-run.
#
# Verified manually against the real VPS before being written here.
set -euo pipefail

BASE_DIR="/srv/apps/yuriisoft-web"
DEPLOY_USER="yuriisoft"
APP_USER="nextapp"

sudo mkdir -p "${BASE_DIR}/releases"
sudo mkdir -p "${BASE_DIR}/shared"

sudo chown "${DEPLOY_USER}:${DEPLOY_USER}" "${BASE_DIR}/releases"

sudo chown "${APP_USER}:${APP_USER}" "${BASE_DIR}/shared"
sudo chmod 700 "${BASE_DIR}/shared"

echo
echo "Resulting layout:"
ls -la "${BASE_DIR}/"
