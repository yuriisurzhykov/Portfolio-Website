#!/usr/bin/env bash
# Creates the directory layout for a Next.js app deployment target,
# parallel to /srv/apps/yuriisoft (the old frontend/ static site's release
# directory) — cutover at nginx already happened, so that directory is no
# longer serving traffic and is just pending manual removal on the VPS;
# this script doesn't touch it either way.
#
# Parameterized via APP_BASE_DIR so the same script provisions both the
# eventual production target (/srv/apps/yuriisoft-web, the default) and a
# separate dev/staging rehearsal target (/srv/apps/yuriisoft-web-dev) —
# used to prove the whole pipeline (migrations, systemd, nginx) against
# dev.yuriisoft.me + a real-but-separate database before ever touching
# production. See .scripts/provision/README.md.
#
#   ${APP_BASE_DIR}/releases/  — one new timestamped folder per deploy
#     (owned by the deploy user, "yuriisoft" — same account that already
#     unpacks frontend releases today).
#   ${APP_BASE_DIR}/shared/    — things that survive every release:
#     - backend/.env (DATABASE_URL, JWT secrets). Owned by "nextapp", mode
#       700, so it's unreadable to every other account, including the
#       deploy user itself (deploy.sh has to use sudo to touch it — see
#       06-app-env.sh).
#     - media/ — generated covers (backend/src/media/, MEDIA_DIR env var).
#       Mode 755, NOT 700 — nginx (a different, unprivileged user, see
#       10-nginx-site.sh's `location /media/`) needs to READ these files
#       directly, without going through Node at all; only "nextapp" (the
#       app writing new covers) needs write access. Living under `shared/`,
#       not inside a release, is what makes a generated cover survive the
#       NEXT deploy instead of vanishing with the release directory that
#       created it.
#
# Idempotent: `mkdir -p`/`chown`/`chmod` are naturally safe to re-run.
#
# Verified manually against the real VPS before being written here.
set -euo pipefail

BASE_DIR="${APP_BASE_DIR:-/srv/apps/yuriisoft-web}"
DEPLOY_USER="yuriisoft"
APP_USER="nextapp"

sudo mkdir -p "${BASE_DIR}/releases"
sudo mkdir -p "${BASE_DIR}/shared"
sudo mkdir -p "${BASE_DIR}/shared/media"

sudo chown "${DEPLOY_USER}:${DEPLOY_USER}" "${BASE_DIR}/releases"

sudo chown "${APP_USER}:${APP_USER}" "${BASE_DIR}/shared"
sudo chmod 700 "${BASE_DIR}/shared"

# Deliberately more permissive than shared/ itself (700) — see this file's
# top comment: nginx must be able to read INSIDE this one subdirectory
# without needing group membership in "nextapp".
sudo chown "${APP_USER}:${APP_USER}" "${BASE_DIR}/shared/media"
sudo chmod 755 "${BASE_DIR}/shared/media"

echo
echo "Resulting layout:"
ls -la "${BASE_DIR}/"
