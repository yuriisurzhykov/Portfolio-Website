#!/bin/bash
set -e  # The most important: if any command fail, the script will be terminated

# Reading arguments (to avoid hardcoded paths, etc.)
RELEASE_TAG=$1
RELEASE_TAR=$2
BASE_DIR=$3

# Fool test
if [ -z "$RELEASE_TAR" ] || [ -z "$BASE_DIR" ]; then
    echo "Usage: ./deploy.sh <path_to_tar> <base_dir>"
    exit 1
fi

# Variables
RELEASE_NAME=$(date +%Y%m%d_%H%M%S)_${RELEASE_TAG}
RELEASE_PATH="${BASE_DIR}/releases/${RELEASE_NAME}"

echo "🚀 Starting deployment of release ${RELEASE_NAME}..."

# 1. Create a release folder
mkdir -p "$RELEASE_PATH"

# 2. Unpacking zip archive (archive must be already pushed to the server)
echo "📦 Unpacking..."
tar -xzf "$RELEASE_TAR" -C "$RELEASE_PATH"

# 3. Копируем Shared файлы (если есть .env)
# cp "${BASE_DIR}/shared/.env" "${RELEASE_PATH}/.env"

# 4. Atomic reference switch
echo "🔗 Switching symlink..."
ln -sfn "$RELEASE_PATH" "${BASE_DIR}/current"

# 5. Cleaning up old releases
echo "🧹 Cleaning up old releases..."
cd "${BASE_DIR}/releases" && ls -t | tail -n +6 | xargs -r rm -rf

# 6. Reloading (nginx and backend if needed).
sudo nginx -t
sudo systemctl reload nginx

echo "✅ Deployment finished successfully!"