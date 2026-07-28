#!/usr/bin/env bash
# Installs /usr/local/bin/set-app-env-finish.sh (root-owned, from
# .scripts/set-app-env-finish.sh in this repo checkout) and grants the
# deploy account (yuriisoft) a narrow sudoers NOPASSWD rule to run exactly
# that one binary - nothing else. This is what makes .scripts/set-app-env.sh
# (run from your own machine) able to add/update a key in an already-live
# shared/.env without yuriisoft ever getting general access to
# nextapp-owned files or a broad sudo grant over cp/chown/systemctl.
#
# Run ON THE VPS, as a user who ALREADY has real (not narrowly-scoped)
# sudo - this script itself installs a new sudoers rule, which the
# yuriisoft/narrow grant this rule is FOR cannot be used to bootstrap
# itself. One-time step; every future env-var update after this goes
# through the narrow grant instead.
#
# Idempotent: safe to re-run after updating set-app-env-finish.sh in the
# repo (re-copies + re-validates), and safe to re-run if the sudoers rule
# already exists (checks content before rewriting).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_SCRIPT="${SCRIPT_DIR}/set-app-env-finish.sh"
DEST_SCRIPT="/usr/local/bin/set-app-env-finish.sh"
SUDOERS_FILE="/etc/sudoers.d/set-app-env"
DEPLOY_USER="${DEPLOY_USER:-yuriisoft}"

if [ ! -f "$SOURCE_SCRIPT" ]; then
    echo "Refusing: expected to find ${SOURCE_SCRIPT} - run this from a full repo checkout on the VPS." >&2
    exit 1
fi

echo "Installing ${DEST_SCRIPT}..."
sudo install -o root -g root -m 700 "$SOURCE_SCRIPT" "$DEST_SCRIPT"
sudo bash -n "$DEST_SCRIPT" # fail loudly here, not the first time yuriisoft tries to use it

SUDOERS_LINE="${DEPLOY_USER} ALL=(root) NOPASSWD: ${DEST_SCRIPT}"
if sudo test -f "$SUDOERS_FILE" && sudo grep -qxF "$SUDOERS_LINE" "$SUDOERS_FILE"; then
    echo "Sudoers rule already present in ${SUDOERS_FILE} - nothing to change."
else
    echo "Installing sudoers rule for ${DEPLOY_USER}..."
    # Written to a temp file and validated with `visudo -c` BEFORE it ever
    # touches /etc/sudoers.d/ - a syntactically broken file dropped
    # directly into that directory can break sudo for EVERY user on the
    # box, including root's own ability to `sudo` its way out of the
    # mistake. This check is not optional.
    TMP_SUDOERS=$(mktemp)
    echo "$SUDOERS_LINE" | sudo tee "$TMP_SUDOERS" > /dev/null
    if ! sudo visudo -c -f "$TMP_SUDOERS"; then
        echo "Refusing: generated sudoers rule failed visudo -c validation." >&2
        sudo rm -f "$TMP_SUDOERS"
        exit 1
    fi
    sudo install -o root -g root -m 440 "$TMP_SUDOERS" "$SUDOERS_FILE"
    sudo rm -f "$TMP_SUDOERS"
    echo "OK: sudoers rule installed."
fi

echo
echo "Verifying ${DEPLOY_USER} can invoke the helper without a password prompt..."
if sudo -u "$DEPLOY_USER" sudo -n -l "$DEST_SCRIPT" > /dev/null 2>&1; then
    echo "OK: ${DEPLOY_USER} can run ${DEST_SCRIPT} via sudo, no password."
else
    echo "WARNING: could not confirm passwordless sudo for ${DEPLOY_USER} on ${DEST_SCRIPT} - check manually with:" >&2
    echo "  sudo -u ${DEPLOY_USER} sudo -n -l ${DEST_SCRIPT}" >&2
fi
