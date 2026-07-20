#!/usr/bin/env bash
# Installs the nightly Postgres backup: pg_dump -> gzip -> local rotation
# (14 days) -> off-box sync to Google Drive via rclone. This replaces the
# safety net that "content lived in git" used to give for free — now the
# DB is the source of truth, and it needs its own backup story (plan
# Phase 6).
#
# Prerequisites this script assumes are already done manually (not
# automated here, since both are interactive/one-time):
#   - `rclone config` run once, remote named "gdrive" (Google Drive OAuth).
#     KNOWN FOLLOW-UP: currently uses rclone's shared client_id, which
#     rclone's own CLI warns is being retired during 2026. Replace with a
#     self-created Google Cloud OAuth client_id before that happens —
#     deferred deliberately (see README) to get production live first.
#   - rclone's config file copied to root's own config path, since the
#     backup script (and its cron job) runs as root:
#       sudo mkdir -p /root/.config/rclone
#       sudo cp /home/<deploy-user>/.config/rclone/rclone.conf /root/.config/rclone/rclone.conf
#       sudo chmod 600 /root/.config/rclone/rclone.conf
#
# Idempotent: overwriting the backup script/.pgpass/cron file with the
# same content is a no-op in effect; never resets a password interactively.
#
# Verified live: a manual run produced a real, valid pg_dump (inspected
# via zcat) and it appeared in `rclone lsf gdrive:portfolio-backups`
# afterwards.
set -euo pipefail

: "${PORTFOLIO_DB_PASSWORD:?Set PORTFOLIO_DB_PASSWORD}"

sudo tee /root/.pgpass > /dev/null <<EOF
127.0.0.1:5432:portfolio:portfolio:${PORTFOLIO_DB_PASSWORD}
EOF
sudo chmod 600 /root/.pgpass

sudo tee /usr/local/bin/pg-backup.sh > /dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
BACKUP_DIR="/var/backups/postgres"
TS=$(date +%Y%m%d_%H%M%S)
FILE="${BACKUP_DIR}/portfolio_${TS}.sql.gz"
mkdir -p "$BACKUP_DIR"
PGPASSFILE=/root/.pgpass pg_dump -h 127.0.0.1 -U portfolio portfolio | gzip > "$FILE"
find "$BACKUP_DIR" -name "portfolio_*.sql.gz" -mtime +14 -delete
rclone sync "$BACKUP_DIR" gdrive:portfolio-backups --log-file=/var/log/pg-backup.log
EOF
sudo chmod +x /usr/local/bin/pg-backup.sh

echo "0 3 * * * root /usr/local/bin/pg-backup.sh" | sudo tee /etc/cron.d/pg-backup > /dev/null

echo
echo "Installed. Run once now to verify end-to-end:"
echo "  sudo /usr/local/bin/pg-backup.sh"
echo "  rclone lsf gdrive:portfolio-backups"
