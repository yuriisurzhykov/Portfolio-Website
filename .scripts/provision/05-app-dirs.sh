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
# `shared/media` being mode 755 is NOT enough on its own for nginx to reach
# it — found in review, not live: Unix path traversal requires execute
# ("search") permission on EVERY ancestor directory, and `shared/` itself
# is mode 700 (nextapp-only), which blocks nginx from ever entering it,
# regardless of what `shared/media`'s own mode says. A plain `chmod` can't
# fix this without ALSO exposing `shared/.env` (still mode 600, but now
# listable/enterable by anyone) — a POSIX ACL grants nginx exactly one bit
# (execute/traversal only, no read, no write) on `shared/` itself, so
# `shared/.env`'s own mode stays the real access boundary for everyone
# else. See this script's live-verification block at the bottom.
#
# Idempotent: `mkdir -p`/`chown`/`chmod`/`setfacl -m` are naturally safe to
# re-run.
#
# Verified manually against the real VPS before being written here.
set -euo pipefail

BASE_DIR="${APP_BASE_DIR:-/srv/apps/yuriisoft-web}"
DEPLOY_USER="yuriisoft"
APP_USER="nextapp"
# Ubuntu's nginx package default worker user — not configured anywhere in
# these provision scripts (10-nginx-site.sh assumes the distro default),
# so it's named once here the same way APP_USER/DEPLOY_USER are.
NGINX_USER="www-data"

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

if ! command -v setfacl &>/dev/null; then
  echo "Installing acl package (setfacl/getfacl)..."
  sudo apt-get update
  sudo apt-get install -y acl
fi

# Execute-only, no read, no write — lets nginx traverse THROUGH shared/ to
# reach shared/media/ without being able to list shared/'s contents or
# open shared/.env (that file's own mode 600 already blocks reading it
# outright; this ACL never touches that).
sudo setfacl -m "u:${NGINX_USER}:--x" "${BASE_DIR}/shared"

echo
echo "Resulting layout:"
ls -la "${BASE_DIR}/"
getfacl "${BASE_DIR}/shared" 2>/dev/null | grep -v '^#'

echo
echo "Verifying nginx (${NGINX_USER}) can traverse into shared/media but still cannot read shared/.env..."
if sudo -u "${NGINX_USER}" test -r "${BASE_DIR}/shared/media"; then
  echo "OK: ${NGINX_USER} can reach ${BASE_DIR}/shared/media."
else
  echo "ERROR: ${NGINX_USER} still cannot reach ${BASE_DIR}/shared/media — check the ACL with: getfacl \"${BASE_DIR}/shared\"" >&2
  exit 1
fi

if sudo -u "${NGINX_USER}" test -r "${BASE_DIR}/shared/.env" 2>/dev/null; then
  echo "WARNING: ${NGINX_USER} can also read ${BASE_DIR}/shared/.env — the ACL is too broad." >&2
else
  echo "OK: ${NGINX_USER} still cannot read ${BASE_DIR}/shared/.env, as expected."
fi
