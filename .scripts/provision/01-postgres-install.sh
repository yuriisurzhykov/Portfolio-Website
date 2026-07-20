#!/usr/bin/env bash
# Installs PostgreSQL 16 (Ubuntu 24.04's default apt version — matches the
# postgres:16-alpine used in the repo-root docker-compose.yml for local dev)
# and verifies it's bound to localhost only.
#
# Idempotent: safe to re-run on a box that already has Postgres installed.
#
# Verified manually against the real VPS (Ubuntu 24.04.4 LTS, resulting
# `psql --version` = 16.14) before being written here — see
# .scripts/provision/README.md for why that order matters.
set -euo pipefail

if dpkg -s postgresql &>/dev/null; then
  echo "PostgreSQL already installed, skipping apt install."
else
  echo "Installing PostgreSQL..."
  sudo apt-get update
  sudo apt-get install -y postgresql postgresql-contrib
fi

echo
echo "PostgreSQL version:"
psql --version

echo
echo "Verifying PostgreSQL is bound to localhost only (defense in depth —
independent of ufw, which also blocks external access to 5432)..."

LISTEN_ADDR=$(sudo -u postgres psql -tAc "SHOW listen_addresses;")
if [ "$LISTEN_ADDR" != "localhost" ]; then
  echo "ERROR: listen_addresses is '$LISTEN_ADDR', expected 'localhost'." >&2
  echo "Refusing to continue — fix postgresql.conf and 'systemctl restart postgresql' manually, then re-run this script." >&2
  exit 1
fi
echo "OK: listen_addresses = localhost"

PG_VERSION_DIR=$(ls /etc/postgresql/)
HBA_FILE="/etc/postgresql/${PG_VERSION_DIR}/main/pg_hba.conf"

if grep -vE '^\s*#|^\s*$' "$HBA_FILE" | grep -qE '0\.0\.0\.0/0|::/0'; then
  echo "ERROR: $HBA_FILE contains a wide-open CIDR rule (0.0.0.0/0 or ::/0)." >&2
  echo "Refusing to continue — remove that rule manually, then re-run this script." >&2
  exit 1
fi
echo "OK: no wide-open pg_hba.conf rules found"

echo
echo "Real network fact (not just config):"
sudo ss -tulpn | grep 5432 || echo "WARNING: nothing listening on 5432 yet — is the service running?"
