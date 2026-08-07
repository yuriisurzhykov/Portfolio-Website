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
# Runs as `nextapp`, not root, via `runuser` — cleanup-expired-sessions.ts
# only needs the DB credentials `nextapp`'s own `current/backend/.env`
# already has (mode 600, owned by nextapp — see 06-app-env.sh); no reason
# to run this with more privilege than the app process itself has.
#
# Parameterized via APP_BASE_DIR/SERVICE_LABEL the same way 05-app-dirs.sh/
# 06-app-env.sh are, so dev and prod each get their own cron file instead
# of one script silently overwriting the other's.
#
# Idempotent: overwriting the cron file with the same content is a no-op.
set -euo pipefail

: "${APP_BASE_DIR:?Set APP_BASE_DIR, e.g. /srv/apps/yuriisoft-frontend}"
: "${SERVICE_LABEL:?Set SERVICE_LABEL, e.g. yuriisoft-frontend (names the cron/log files uniquely per target)}"

CRON_FILE="/etc/cron.d/session-cleanup-${SERVICE_LABEL}"
LOG_FILE="/var/log/session-cleanup-${SERVICE_LABEL}.log"

echo "0 2 * * * nextapp cd ${APP_BASE_DIR}/current/backend && npm run cleanup-expired-sessions >> ${LOG_FILE} 2>&1" | sudo tee "$CRON_FILE" > /dev/null

echo
echo "Installed ${CRON_FILE}. Run once now to verify end-to-end:"
echo "  sudo runuser -u nextapp -- bash -c 'cd ${APP_BASE_DIR}/current/backend && npm run cleanup-expired-sessions'"
echo "  cat ${LOG_FILE}"
