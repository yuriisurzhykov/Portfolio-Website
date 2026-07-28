#!/bin/bash
set -e  # Same principle as deploy.sh: any failed command aborts the deploy.

# Deploys the Next.js app (frontend/ + backend/), unlike the old deploy.sh
# which only ever unpacked static files for the legacy Vite frontend/ this
# one replaced (that script and the directory it deployed are both retired
# now). Extra steps this needs that the old deploy.sh didn't: wiring the
# persistent secrets file into the new release, running database
# migrations, and restarting a systemd service instead of just reloading
# nginx (nginx's own config doesn't change per-deploy for this app — it
# always points at the same fixed port).
#
# Verified manually, step by step, against the real VPS (dev target first,
# then prod) before being wrapped in this script — see
# .cursor/plans/database-backed_cms_migration_59a172e7.plan.md, Phase 6.
#
# Renamed from deploy-web.sh when web/ was renamed to frontend/ — see
# .cursor/plans/retire_frontend_and_rename_web_204713a8.plan.md.

RELEASE_TAG=$1
RELEASE_TAR=$2
BASE_DIR=$3
SERVICE_NAME=$4

if [ -z "$RELEASE_TAR" ] || [ -z "$BASE_DIR" ] || [ -z "$SERVICE_NAME" ]; then
    echo "Usage: ./deploy-frontend.sh <tag> <path_to_tar> <base_dir> <systemd_service_name>"
    exit 1
fi

RELEASE_NAME=$(date +%Y%m%d_%H%M%S)_${RELEASE_TAG}
RELEASE_PATH="${BASE_DIR}/releases/${RELEASE_NAME}"

echo "🚀 Deploying release ${RELEASE_NAME} to ${SERVICE_NAME}..."

echo "📦 Unpacking..."
mkdir -p "$RELEASE_PATH"
tar -xzf "$RELEASE_TAR" -C "$RELEASE_PATH"

# Note: the `current` symlink switch itself happens INSIDE
# deploy-frontend-finish.sh (after migrations succeed, before the restart)
# — not here, and not standalone — because BASE_DIR itself is root-owned
# (unlike releases/ and shared/ inside it), so switching it needs the
# same root privilege as everything else below anyway. Keeping it in the
# same script also means: if migrations fail, `current` never gets
# pointed at a half-migrated release in the first place.

# Everything below needs root (wiring shared/.env into the release,
# running migrations as nextapp, restarting the service) — delegated to
# ONE narrow, fixed-behavior script rather than granting the deploy
# account passwordless sudo over general-purpose tools (cp/chown/chmod/
# npx) directly. See deploy-frontend-finish.sh's own header for why that
# distinction matters.
echo "🔐 Wiring secrets, applying migrations, restarting ${SERVICE_NAME}..."
if ! sudo /usr/local/bin/deploy-frontend-finish.sh "$BASE_DIR" "$RELEASE_PATH" "$SERVICE_NAME"; then
    echo "❌ deploy-frontend-finish.sh failed. Check: sudo journalctl -u ${SERVICE_NAME} -n 50"
    exit 1
fi

echo "🧹 Cleaning up old releases..."
cd "${BASE_DIR}/releases" && ls -t | tail -n +6 | xargs -r rm -rf

echo "✅ Deployment finished successfully!"
