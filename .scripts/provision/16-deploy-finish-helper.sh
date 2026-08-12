#!/usr/bin/env bash
# Installs /usr/local/bin/deploy-frontend-finish.sh (root-owned, from
# .scripts/deploy-frontend-finish.sh in this repo checkout) and grants the
# deploy account (yuriisoft) a narrow sudoers NOPASSWD rule to run exactly
# that one binary - nothing else. This is what makes .scripts/deploy-frontend.sh
# (invoked by deploy-target.yml, or by hand) able to wire shared/.env into a
# new release, run migrations, and restart the service, WITHOUT yuriisoft
# (or a compromised CI run) ever getting general sudo over cp/chown/systemctl/npx.
#
# Same reasoning, same pattern as 12-set-app-env-helper.sh for
# set-app-env-finish.sh - written after finding, live, that
# deploy-frontend-finish.sh had NO equivalent installer at all: its very
# first install (then named deploy-web-finish.sh) was done by hand during
# the original Phase 6 bring-up and never got backfilled into a script, so
# every later edit to it needed a human to remember the exact `install`/
# sudoers-file shape from scratch. This file exists so that stops being true.
#
# Run ON THE VPS, as a user who ALREADY has real (not narrowly-scoped)
# sudo - this script itself installs a new sudoers rule, which the
# yuriisoft/narrow grant this rule is FOR cannot be used to bootstrap
# itself. One-time step per box; every future edit to deploy-frontend-finish.sh
# after this is: re-run this script once (from an updated checkout) to
# push the new content into place, no sudoers work needed again.
#
# Idempotent: safe to re-run after updating deploy-frontend-finish.sh in the
# repo (re-copies + re-validates), and safe to re-run if the sudoers rule
# already exists (checks content before rewriting).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_SCRIPT="${SCRIPT_DIR}/deploy-frontend-finish.sh"
DEST_SCRIPT="/usr/local/bin/deploy-frontend-finish.sh"
SUDOERS_FILE="/etc/sudoers.d/deploy-frontend-finish"
DEPLOY_USER="${DEPLOY_USER:-yuriisoft}"

if [ ! -f "$SOURCE_SCRIPT" ]; then
    echo "Refusing: expected to find ${SOURCE_SCRIPT} - run this from a full repo checkout on the VPS." >&2
    exit 1
fi

echo "Installing ${DEST_SCRIPT}..."
# Mode 755, not 700 like set-app-env-finish.sh's — deploy-frontend.sh's own
# invocation (`sudo /usr/local/bin/deploy-frontend-finish.sh ...`) runs it
# as root either way, but 755 lets a human read/audit it without sudo too,
# matching what was already true of the hand-installed original.
sudo install -o root -g root -m 755 "$SOURCE_SCRIPT" "$DEST_SCRIPT"
sudo bash -n "$DEST_SCRIPT" # fail loudly here, not the first time a real deploy tries to use it

# No fixed argument list in the sudoers rule (unlike a command that always
# takes the same input) - deploy-frontend.sh calls this with a NEW
# RELEASE_PATH every deploy, and the script itself already refuses to run
# for anything outside its two known BASE_DIR/SERVICE_NAME targets (see its
# own header comment) - the sudoers rule only needs to pin the BINARY,
# argument validation is this script's own job, not sudo's.
SUDOERS_LINE="${DEPLOY_USER} ALL=(root) NOPASSWD: ${DEST_SCRIPT}"
if sudo test -f "$SUDOERS_FILE" && sudo grep -qxF "$SUDOERS_LINE" "$SUDOERS_FILE"; then
    echo "Sudoers rule already present in ${SUDOERS_FILE} - nothing to change."
else
    echo "Installing sudoers rule for ${DEPLOY_USER}..."
    # Same "validate before it ever touches /etc/sudoers.d/" reasoning as
    # 12-set-app-env-helper.sh - a syntactically broken file dropped there
    # directly can break sudo for EVERY user on the box, including root's
    # own way out of the mistake.
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
