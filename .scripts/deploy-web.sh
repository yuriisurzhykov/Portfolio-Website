#!/bin/bash
set -e  # Same principle as deploy.sh: any failed command aborts the deploy.

# Deploys the Next.js app (web/ + backend/), unlike deploy.sh which only
# ever unpacks static files for frontend/. Extra steps this needs that
# deploy.sh doesn't: wiring the persistent secrets file into the new
# release, running database migrations, and restarting a systemd service
# instead of just reloading nginx (nginx's own config doesn't change
# per-deploy for this app — it always points at the same fixed port).
#
# Verified manually, step by step, against the real VPS (dev target first,
# then prod) before being wrapped in this script — see
# .cursor/plans/database-backed_cms_migration_59a172e7.plan.md, Phase 6.

RELEASE_TAG=$1
RELEASE_TAR=$2
BASE_DIR=$3
SERVICE_NAME=$4

if [ -z "$RELEASE_TAR" ] || [ -z "$BASE_DIR" ] || [ -z "$SERVICE_NAME" ]; then
    echo "Usage: ./deploy-web.sh <tag> <path_to_tar> <base_dir> <systemd_service_name>"
    exit 1
fi

RELEASE_NAME=$(date +%Y%m%d_%H%M%S)_${RELEASE_TAG}
RELEASE_PATH="${BASE_DIR}/releases/${RELEASE_NAME}"

echo "🚀 Deploying release ${RELEASE_NAME} to ${SERVICE_NAME}..."

echo "📦 Unpacking..."
mkdir -p "$RELEASE_PATH"
tar -xzf "$RELEASE_TAR" -C "$RELEASE_PATH"

# shared/.env persists across every release (see .scripts/provision/06-app-env.sh) —
# copied fresh into each new release rather than living inside releases/
# itself, so a deploy never needs to know/re-enter secrets.
echo "🔐 Wiring persistent secrets..."
sudo cp "${BASE_DIR}/shared/.env" "${RELEASE_PATH}/backend/.env"
sudo chown nextapp:nextapp "${RELEASE_PATH}/backend/.env"
sudo chmod 600 "${RELEASE_PATH}/backend/.env"

# Runs as nextapp, not the deploy user: only nextapp can read backend/.env
# (mode 600), and this is the same account that will run the app itself.
echo "🗄️  Applying database migrations..."
(cd "${RELEASE_PATH}/backend" && sudo -u nextapp npx prisma migrate deploy)

echo "🔗 Switching symlink..."
ln -sfn "$RELEASE_PATH" "${BASE_DIR}/current"

echo "♻️  Restarting ${SERVICE_NAME}..."
sudo systemctl restart "${SERVICE_NAME}"
sleep 2
if ! sudo systemctl is-active --quiet "${SERVICE_NAME}"; then
    echo "❌ ${SERVICE_NAME} failed to start after restart. Check: sudo journalctl -u ${SERVICE_NAME} -n 50"
    exit 1
fi

echo "🧹 Cleaning up old releases..."
cd "${BASE_DIR}/releases" && ls -t | tail -n +6 | xargs -r rm -rf

echo "✅ Deployment finished successfully!"
