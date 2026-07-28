#!/usr/bin/env bash
# Root-owned helper that adds/updates individual KEY=VALUE pairs in an
# already-existing ${BASE_DIR}/shared/.env, leaving every other key
# untouched, then wires the result into the currently deployed release and
# restarts the service. Installed at /usr/local/bin/set-app-env-finish.sh
# by provision/12-set-app-env-helper.sh, which also grants the deploy
# account (yuriisoft) a narrow sudoers NOPASSWD rule for exactly this path
# - see that script's header for why this exists as a separate installed
# binary instead of the deploy account getting general sudo over cp/cat/
# chown/systemctl directly (same reasoning as deploy-web-finish.sh: one
# fixed, auditable script is a much smaller attack surface than a wildcard
# sudoers rule over general-purpose tools).
#
# shared/.env is mode 600 owned by nextapp - the deploy account (yuriisoft)
# has NO access to it at all, not even to list the directory (see
# provision/05-app-dirs.sh: shared/ is mode 700). Every read/write of the
# real file below runs as root (this script itself), never via a `sudo`
# prefix inside here - that would be redundant/wrong once this script is
# itself already running as root via the sudoers grant.
set -euo pipefail

BASE_DIR="$1"
shift

case "$BASE_DIR" in
    /srv/apps/yuriisoft-web | /srv/apps/yuriisoft-web-dev) ;;
    *)
        echo "Refusing: unrecognized BASE_DIR '${BASE_DIR}'" >&2
        exit 1
        ;;
esac

ENV_FILE="${BASE_DIR}/shared/.env"
APP_USER="nextapp"

if [ "$#" -eq 0 ]; then
    echo "Usage: $0 <base_dir> KEY=VALUE [KEY2=VALUE2 ...]" >&2
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "${ENV_FILE} doesn't exist yet - run provision/06-app-env.sh first (initial DATABASE_URL/JWT_* bring-up)." >&2
    exit 1
fi

TMP_FILE=$(mktemp)
trap 'rm -f "$TMP_FILE"' EXIT
cp "$ENV_FILE" "$TMP_FILE"

for pair in "$@"; do
    if [[ "$pair" != *=* ]]; then
        echo "Refusing: '${pair}' isn't in KEY=VALUE form." >&2
        exit 1
    fi
    key="${pair%%=*}"
    value="${pair#*=}"

    # Same shape Postgres/shell env vars are required to have - catches a
    # pasted-in "export FOO=bar" or an accidental extra "=" before it ever
    # touches the real file.
    if [[ ! "$key" =~ ^[A-Z_][A-Z0-9_]*$ ]]; then
        echo "Refusing: '${key}' doesn't look like a valid env var name (expected UPPER_SNAKE_CASE)." >&2
        exit 1
    fi

    if grep -q "^${key}=" "$TMP_FILE"; then
        sed -i "s|^${key}=.*|${key}=\"${value}\"|" "$TMP_FILE"
        echo "Updated ${key}"
    else
        printf '%s="%s"\n' "$key" "$value" >> "$TMP_FILE"
        echo "Added ${key}"
    fi
done

cp "$TMP_FILE" "$ENV_FILE"
chown "${APP_USER}:${APP_USER}" "$ENV_FILE"
chmod 600 "$ENV_FILE"
echo "OK: ${ENV_FILE} updated."

CURRENT_RELEASE="${BASE_DIR}/current"
if [ -L "$CURRENT_RELEASE" ]; then
    SERVICE_NAME="yuriisoft-web.service"
    [ "$BASE_DIR" = "/srv/apps/yuriisoft-web-dev" ] && SERVICE_NAME="yuriisoft-web-dev.service"

    echo "Wiring into the current release and restarting ${SERVICE_NAME}..."
    cp "$ENV_FILE" "${CURRENT_RELEASE}/backend/.env"
    chown "${APP_USER}:${APP_USER}" "${CURRENT_RELEASE}/backend/.env"
    chmod 600 "${CURRENT_RELEASE}/backend/.env"

    systemctl restart "$SERVICE_NAME"
    sleep 2
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        echo "OK: ${SERVICE_NAME} is active with the updated environment."
    else
        echo "ERROR: ${SERVICE_NAME} failed to come back up. Check: journalctl -u ${SERVICE_NAME} -n 50" >&2
        exit 1
    fi
else
    echo "No 'current' release yet (nothing deployed) - value saved to shared/.env, will apply on the first deploy."
fi
