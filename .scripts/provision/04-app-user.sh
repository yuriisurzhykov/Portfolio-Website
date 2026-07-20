#!/usr/bin/env bash
# Creates a dedicated, unprivileged system account that the Next.js
# systemd service runs as — analogous to how nginx's worker processes run
# as www-data rather than root. Deliberately NOT the SSH/deploy account
# (which has sudo) — if the app process is ever compromised (e.g. a future
# file-upload RCE), the blast radius stops at this account's own
# permissions instead of reaching sudo.
#
# Idempotent: does nothing if the user already exists.
#
# Verified manually against the real VPS before being written here.
set -euo pipefail

APP_USER="nextapp"

if id "${APP_USER}" &>/dev/null; then
  echo "User '${APP_USER}' already exists, skipping creation."
else
  echo "Creating system user '${APP_USER}' (no login shell, no home dir)..."
  sudo useradd --system --no-create-home --shell /usr/sbin/nologin "${APP_USER}"
fi

echo
echo "Verify: expect no 'sudo'/admin group membership below."
id "${APP_USER}"
groups "${APP_USER}"
