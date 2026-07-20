#!/usr/bin/env bash
# Root-owned helper performing the exact, fixed set of privileged actions
# a web/ deploy needs: wire shared/.env into the new release, run
# migrations as nextapp, restart the systemd service. Invoked via a SINGLE
# narrow sudoers NOPASSWD rule (see .scripts/provision/README.md) instead
# of granting the deploy account passwordless access to general-purpose
# primitives (cp/chown/chmod/npx) directly.
#
# Why this matters: a general-purpose tool exposed via a wildcard sudoers
# rule is a much larger attack surface than one script whose entire
# behavior is fixed here and auditable in one place — in particular,
# `sudo npx prisma migrate deploy` on its own would apply whatever
# migrations exist in the CALLER'S CURRENT DIRECTORY (prisma resolves
# `prisma/migrations` relative to cwd, not to any fixed path), which is a
# real privilege-escalation vector if that rule doesn't pin the directory
# down. This script pins every path down explicitly and refuses to run at
# all if the arguments don't match one of exactly two known deploy
# targets — even though the sudoers rule itself uses a wildcard for the
# release path (which changes every deploy), this script's own validation
# constrains what that wildcard can actually be used for.
set -euo pipefail

BASE_DIR="$1"
RELEASE_PATH="$2"
SERVICE_NAME="$3"

case "$BASE_DIR" in
    /srv/apps/yuriisoft-web | /srv/apps/yuriisoft-web-dev) ;;
    *)
        echo "Refusing: unrecognized BASE_DIR '${BASE_DIR}'" >&2
        exit 1
        ;;
esac

case "$RELEASE_PATH" in
    "${BASE_DIR}"/releases/*) ;;
    *)
        echo "Refusing: RELEASE_PATH '${RELEASE_PATH}' is not under ${BASE_DIR}/releases/" >&2
        exit 1
        ;;
esac

case "$SERVICE_NAME" in
    yuriisoft-web.service | yuriisoft-web-dev.service) ;;
    *)
        echo "Refusing: unrecognized SERVICE_NAME '${SERVICE_NAME}'" >&2
        exit 1
        ;;
esac

cp "${BASE_DIR}/shared/.env" "${RELEASE_PATH}/backend/.env"
chown nextapp:nextapp "${RELEASE_PATH}/backend/.env"
chmod 600 "${RELEASE_PATH}/backend/.env"

(cd "${RELEASE_PATH}/backend" && runuser -u nextapp -- npx prisma migrate deploy)

# Symlink switch happens here — AFTER migrations succeed (so a failed
# migration never makes `current` point at a broken release) but BEFORE
# the restart (so the restarted process actually picks up the new
# release, since `WorkingDirectory` is resolved fresh at process start).
# Needs root too: ${BASE_DIR} itself (unlike releases/ and shared/ inside
# it) was never chowned away from root.
ln -sfn "${RELEASE_PATH}" "${BASE_DIR}/current"

systemctl restart "${SERVICE_NAME}"
sleep 2
systemctl is-active --quiet "${SERVICE_NAME}"
