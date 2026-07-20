#!/usr/bin/env bash
# Installs Node.js 20 LTS via NodeSource — matches "node-version: 20" in
# .github/workflows/backend-web-checks.yml. Ubuntu 24.04's default apt repo
# only offers Node 18, which risks CI/VPS behavior drift for a Next.js 16
# app (see docker-compose.yml / .scripts/provision/01-postgres-install.sh
# for the same "match CI/dev major version exactly" reasoning applied to
# Postgres).
#
# Idempotent: skips the NodeSource repo setup if a v20.x Node is already
# installed.
#
# Verified manually against the real VPS (resulting `node -v` = v20.20.2)
# before being written here.
set -euo pipefail

CURRENT_MAJOR=""
if command -v node &>/dev/null; then
  CURRENT_MAJOR=$(node -v | sed -E 's/^v([0-9]+)\..*/\1/')
fi

if [ "$CURRENT_MAJOR" = "20" ]; then
  echo "Node.js 20.x already installed ($(node -v)), skipping NodeSource setup."
else
  echo "Setting up NodeSource apt repo for Node.js 20.x..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo
echo "Node.js version:"
node -v
echo "npm version:"
npm -v
