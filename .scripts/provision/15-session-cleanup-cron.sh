#!/usr/bin/env bash
# Installs a nightly cron job (2am, offset an hour from 11-pg-backup.sh's
# 3am so the two never contend for DB connections at once) that deletes
# long-expired Session rows via `backend/scripts/
# cleanup-expired-sessions.ts` (the actual 7-day-past-expiry rule lives in
# `backend/src/auth/session.ts`'s `deleteExpiredSessions()`, independently
# tested there — this script only wires it into cron). Added during the
# OWASP audit remediation: without this, the Session table grows forever
# — every login/refresh inserts a row, and token rotation only revokes the
# old one, never removes it.
#
# Runs as `nextapp`, not root, via cron's own per-line user field —
# cleanup-expired-sessions.ts only needs the DB credentials `nextapp`'s own
# `current/backend/.env` already has (mode 600, owned by nextapp — see
# 06-app-env.sh); no reason to run this with more privilege than the app
# process itself has.
#
# LOG_FILE lives under `${APP_BASE_DIR}/shared/` (mode 700, owned by
# `nextapp` — see 05-app-dirs.sh), NOT `/var/log` — found via real review,
# not by running it: a cron.d line's `user` field controls which user
# EXECUTES the whole command string, including any `>> file` redirection
# in it, so the shell that opens `LOG_FILE` for append is `nextapp`
# itself, not root. `/var/log` is root-owned with no write access for any
# other user, and nothing here ever pre-creates/chowns a file inside it —
# the original version of this script (redirecting straight to
# `/var/log/session-cleanup-*.log`) would have failed with "Permission
# denied" on the very first cron run, silently never cleaning up a single
# session. `${APP_BASE_DIR}/shared/` needs no such pre-creation step:
# `nextapp` already owns the whole directory.
#
# Parameterized via APP_BASE_DIR/SERVICE_LABEL the same way 05-app-dirs.sh/
# 06-app-env.sh are, so dev and prod each get their own cron file instead
# of one script silently overwriting the other's.
#
# Idempotent: overwriting the cron file with the same content is a no-op.
set -euo pipefail

: "${APP_BASE_DIR:?Set APP_BASE_DIR, e.g. /srv/apps/yuriisoft-frontend}"
: "${SERVICE_LABEL:?Set SERVICE_LABEL, e.g. yuriisoft-frontend (names the cron file uniquely per target)}"

CRON_FILE="/etc/cron.d/session-cleanup-${SERVICE_LABEL}"
LOG_FILE="${APP_BASE_DIR}/shared/session-cleanup.log"

echo "0 2 * * * nextapp cd ${APP_BASE_DIR}/current/backend && npm run cleanup-expired-sessions >> ${LOG_FILE} 2>&1" | sudo tee "$CRON_FILE" > /dev/null

echo
echo "Installed ${CRON_FILE}. Run once now to verify end-to-end:"
echo "  sudo runuser -u nextapp -- bash -c 'cd ${APP_BASE_DIR}/current/backend && npm run cleanup-expired-sessions'"
echo "  cat ${LOG_FILE}"
