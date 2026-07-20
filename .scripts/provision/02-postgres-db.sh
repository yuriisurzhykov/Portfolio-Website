#!/usr/bin/env bash
# Creates the dedicated, non-superuser Postgres role + database for the app
# (not the "portfolio_dev_only" dev credentials from the repo-root
# docker-compose.yml — those are dev-only and committed in the clear on
# purpose; production needs its own generated secret).
#
# Idempotent: if the role/database already exist, leaves them untouched —
# in particular, never silently resets an existing role's password, which
# would break whatever's already deployed in .env without any warning.
#
# Verified manually against the real VPS before being written here.
set -euo pipefail

DB_ROLE="portfolio"
DB_NAME="portfolio"

ROLE_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_ROLE}'")

if [ "$ROLE_EXISTS" = "1" ]; then
  echo "Role '${DB_ROLE}' already exists — leaving it (and its password) untouched."
else
  if [ -z "${PORTFOLIO_DB_PASSWORD:-}" ]; then
    echo "ERROR: role '${DB_ROLE}' does not exist yet and PORTFOLIO_DB_PASSWORD is not set." >&2
    echo "Generate one with: openssl rand -hex 32   (hex, not base64 — avoids URL-encoding pitfalls in DATABASE_URL)" >&2
    echo "Then re-run as: PORTFOLIO_DB_PASSWORD='<value>' $0" >&2
    exit 1
  fi
  echo "Creating role '${DB_ROLE}'..."
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE ROLE ${DB_ROLE} WITH LOGIN PASSWORD '${PORTFOLIO_DB_PASSWORD}';"
fi

DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")
if [ "$DB_EXISTS" = "1" ]; then
  echo "Database '${DB_NAME}' already exists — leaving it untouched."
else
  echo "Creating database '${DB_NAME}' owned by '${DB_ROLE}'..."
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_ROLE};"
fi

echo
echo "Verifying role privileges (expect all 'f' — not superuser/createdb/createrole):"
sudo -u postgres psql -c "SELECT rolname, rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = '${DB_ROLE}';"
