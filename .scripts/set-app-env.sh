#!/usr/bin/env bash
# MANUAL FALLBACK — the primary path for adding/updating an optional env
# var (e.g. UPSTASH_REDIS_REST_URL/_TOKEN) is now .github/workflows/
# deploy-web.yaml's "Sync optional env vars" steps, driven by GitHub
# Actions secrets on every deploy — not a human running this by hand. Use
# THIS script only for a one-off value not yet wired into that workflow,
# or for debugging on a box the CI hasn't reached yet.
#
# Why a human still can't just SSH in and edit the file directly:
# shared/.env is owned by nextapp, mode 700 directory — yuriisoft (the
# deploy account, used by both CI and this script) has NO access to it at
# all, by design (see provision/05-app-dirs.sh) — that restriction is
# unchanged and applies identically whether the caller is a human at a
# laptop or the CI pipeline; neither gets more than a narrow, auditable
# sudoers NOPASSWD grant to run ONE fixed root script
# (/usr/local/bin/set-app-env-finish.sh, installed once by
# provision/12-set-app-env-helper.sh).
#
# Usage:
#   .scripts/set-app-env.sh prod UPSTASH_REDIS_REST_URL="https://xxx.upstash.io" UPSTASH_REDIS_REST_TOKEN="xxx"
#   .scripts/set-app-env.sh dev  UPSTASH_REDIS_REST_URL="https://yyy.upstash.io" UPSTASH_REDIS_REST_TOKEN="yyy"
#
# Override SSH_USER/SSH_HOST if they ever differ from the values below
# (e.g. a future VPS migration - see provision/README.md's own note about
# that being the whole reason this directory exists).
set -euo pipefail

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <dev|prod> KEY=VALUE [KEY2=VALUE2 ...]" >&2
    exit 1
fi

TARGET="$1"
shift

SSH_USER="${SSH_USER:-yuriisoft}"

case "$TARGET" in
    prod)
        SSH_HOST="${SSH_HOST:-yuriisoft.me}"
        BASE_DIR="/srv/apps/yuriisoft-web"
        ;;
    dev)
        SSH_HOST="${SSH_HOST:-dev.yuriisoft.me}"
        BASE_DIR="/srv/apps/yuriisoft-web-dev"
        ;;
    *)
        echo "Usage: $0 <dev|prod> KEY=VALUE [KEY2=VALUE2 ...]" >&2
        exit 1
        ;;
esac

# Every KEY=VALUE argument is shell-quoted individually before being
# joined into the single command string ssh sends to the remote shell -
# without this, a value containing a space/quote/$ (a realistic shape for
# a generated token) would be split or expanded wrong on the remote end.
# Verified against exactly this shape of value (URLs with "://", tokens
# with "+/=") before being relied on here.
REMOTE_ARGS=()
for pair in "$@"; do
    REMOTE_ARGS+=("$(printf '%q' "$pair")")
done

echo "Updating ${TARGET} (${SSH_HOST}:${BASE_DIR})..."
ssh "${SSH_USER}@${SSH_HOST}" "sudo /usr/local/bin/set-app-env-finish.sh ${BASE_DIR} ${REMOTE_ARGS[*]}"
