#!/usr/bin/env bash
# Writes ${APP_BASE_DIR}/shared/.env — the one file holding real secrets
# (DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET) for one deployment
# target. Owned by nextapp, mode 600 — the deploy account itself
# (yuriisoft) cannot read it back after writing it.
#
# Parameterized (APP_BASE_DIR, DB_NAME) so the same script writes both the
# production .env (portfolio DB, the defaults) and the dev/staging one
# (portfolio_dev DB, /srv/apps/yuriisoft-web-dev) — see
# .scripts/provision/README.md and 05-app-dirs.sh for why a separate
# rehearsal target exists at all.
#
# Refuses to overwrite an existing .env: resetting a live JWT secret
# invalidates every existing session/access token instantly, and resetting
# DATABASE_URL to a wrong value silently breaks the running app. Both must
# be a deliberate act (delete the file yourself first), never an accidental
# side effect of re-running this script.
#
# Secrets are read from environment variables at run time — never
# hardcoded, never committed. Generate them with:
#   PORTFOLIO_DB_PASSWORD:  the role password from 02-postgres-db.sh
#     (same role/password serves every database it owns, dev and prod
#     alike — only DB_NAME differs)
#   JWT_ACCESS_SECRET / JWT_REFRESH_SECRET (two DIFFERENT values, and a
#   DIFFERENT pair per target — dev and prod should never share a JWT
#   secret): node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
#
# Verified manually against the real VPS before being written here — the
# read/deny boundary was tested live (nextapp can read it, the deploy
# account gets "Permission denied" without sudo).
set -euo pipefail

BASE_DIR="${APP_BASE_DIR:-/srv/apps/yuriisoft-web}"
DB_NAME="${DB_NAME:-portfolio}"
ENV_FILE="${BASE_DIR}/shared/.env"
APP_USER="nextapp"

if [ -f "${ENV_FILE}" ]; then
  echo "${ENV_FILE} already exists — refusing to overwrite it."
  echo "Delete it manually first if you really intend to replace it."
  exit 0
fi

: "${PORTFOLIO_DB_PASSWORD:?Set PORTFOLIO_DB_PASSWORD}"
: "${JWT_ACCESS_SECRET:?Set JWT_ACCESS_SECRET}"
: "${JWT_REFRESH_SECRET:?Set JWT_REFRESH_SECRET (must differ from JWT_ACCESS_SECRET)}"

sudo tee "${ENV_FILE}" > /dev/null <<EOF
DATABASE_URL="postgresql://portfolio:${PORTFOLIO_DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}"
JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}"
EOF

sudo chown "${APP_USER}:${APP_USER}" "${ENV_FILE}"
sudo chmod 600 "${ENV_FILE}"

echo
echo "Verifying the access boundary..."
if sudo -u "${APP_USER}" test -r "${ENV_FILE}"; then
  echo "OK: ${APP_USER} can read ${ENV_FILE}"
else
  echo "ERROR: ${APP_USER} cannot read ${ENV_FILE} — check ownership/permissions." >&2
  exit 1
fi

if cat "${ENV_FILE}" &>/dev/null; then
  echo "WARNING: the current user can also read ${ENV_FILE} — permissions are too loose." >&2
else
  echo "OK: current user (deploy account) cannot read ${ENV_FILE}, as expected."
fi
