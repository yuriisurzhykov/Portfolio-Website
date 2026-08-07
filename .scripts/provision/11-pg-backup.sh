#!/usr/bin/env bash
# Installs the nightly Postgres backup: pg_dump -> gzip -> local rotation
# (14 days) -> off-box sync, ENCRYPTED, to Google Drive via rclone. This
# replaces the safety net that "content lived in git" used to give for
# free — now the DB is the source of truth, and it needs its own backup
# story (plan Phase 6).
#
# Prerequisites this script assumes are already done manually (not
# automated here, since all are interactive/one-time):
#   - `rclone config` run once, remote named "gdrive" (Google Drive OAuth).
#     KNOWN FOLLOW-UP: currently uses rclone's shared client_id, which
#     rclone's own CLI warns is being retired during 2026. Replace with a
#     self-created Google Cloud OAuth client_id before that happens —
#     deferred deliberately (see README) to get production live first.
#   - A SECOND, one-time `rclone config` step layering a "crypt" remote
#     ("gdrive-crypt" by default — override via RCLONE_CRYPT_REMOTE) on
#     top of "gdrive" (`rclone config create gdrive-crypt crypt remote
#     gdrive:portfolio-backups-encrypted password <your-passphrase>
#     filename_encryption standard` — or run `rclone config` interactively
#     and choose "crypt" as the type). Added during the OWASP audit
#     remediation (F6): before this, dumps left the box UNENCRYPTED —
#     anyone with read access to the Google Drive folder (or a compromised
#     Google account/shared client_id) could read the entire database,
#     password hashes included. Store the passphrase somewhere OTHER than
#     this VPS (a password manager) — if it only ever lived here, losing
#     the VPS loses the ability to decrypt its own backups.
#   - rclone's config file copied to root's own config path, since the
#     backup script (and its cron job) runs as root:
#       sudo mkdir -p /root/.config/rclone
#       sudo cp /home/<deploy-user>/.config/rclone/rclone.conf /root/.config/rclone/rclone.conf
#       sudo chmod 600 /root/.config/rclone/rclone.conf
#
# Idempotent: overwriting the backup script/.pgpass/cron file with the
# same content is a no-op in effect; never resets a password interactively.
#
# Verified live (2026-08-06, OWASP audit remediation): the exact
# pg_dump | gzip -> umask 077 -> chmod 600 -> rclone crypt sync -> rclone
# crypt copy-back -> gunzip pipeline below was run for real against a
# local Postgres and a LOCAL rclone crypt remote (a real crypt remote
# wrapping a plain local directory instead of a real Google Drive account
# — the crypt/encryption mechanism itself is identical either way, only
# the underlying storage backend differs). Confirmed: (1) the raw bytes
# sitting in the underlying "remote" storage start with rclone's own
# "RCLONE" crypt header, NOT the gzip magic number (0x1f 0x8b) — genuinely
# encrypted at rest, not just relabeled; (2) filenames in that underlying
# storage are unrecognizable base32 strings, not `portfolio_<timestamp>.
# sql.gz`; (3) copying back through the SAME crypt remote and gunzipping
# reproduced the original dump byte-for-byte (SHA-256 match) with valid,
# readable SQL inside (8 `CREATE TABLE` statements). The original version
# of this script (unencrypted `rclone sync ... gdrive:portfolio-backups`)
# was ALSO verified live the same way, per its own earlier note — this
# entry only re-verifies the NEW encryption step, not the whole pipeline
# from scratch.
set -euo pipefail

: "${PORTFOLIO_DB_PASSWORD:?Set PORTFOLIO_DB_PASSWORD}"
RCLONE_CRYPT_REMOTE="${RCLONE_CRYPT_REMOTE:-gdrive-crypt}"

sudo tee /root/.pgpass > /dev/null <<EOF
127.0.0.1:5432:portfolio:portfolio:${PORTFOLIO_DB_PASSWORD}
EOF
sudo chmod 600 /root/.pgpass

sudo tee /usr/local/bin/pg-backup.sh > /dev/null <<EOF
#!/usr/bin/env bash
set -euo pipefail
# umask 077 BEFORE any file is created — root's default umask (022)
# would otherwise leave the dump world-readable (mode 644): any other
# local user on the box could read the entire database, password hashes
# included, without ever touching Google Drive. chmod below is
# belt-and-braces on top of the umask, not a substitute for it — a
# umask only affects files created AFTER it's set, so if this script is
# ever refactored to create the file before the "set -e" line, the
# explicit chmod is what still catches it.
umask 077
BACKUP_DIR="/var/backups/postgres"
TS=\$(date +%Y%m%d_%H%M%S)
FILE="\${BACKUP_DIR}/portfolio_\${TS}.sql.gz"
mkdir -p -m 700 "\$BACKUP_DIR"
PGPASSFILE=/root/.pgpass pg_dump -h 127.0.0.1 -U portfolio portfolio | gzip > "\$FILE"
chmod 600 "\$FILE"
find "\$BACKUP_DIR" -name "portfolio_*.sql.gz" -mtime +14 -delete
rclone sync "\$BACKUP_DIR" ${RCLONE_CRYPT_REMOTE}:portfolio-backups --log-file=/var/log/pg-backup.log
EOF
sudo chmod +x /usr/local/bin/pg-backup.sh

echo "0 3 * * * root /usr/local/bin/pg-backup.sh" | sudo tee /etc/cron.d/pg-backup > /dev/null

echo
echo "Installed. Run once now to verify end-to-end:"
echo "  sudo /usr/local/bin/pg-backup.sh"
echo "  ls -l /var/backups/postgres  # confirm dumps are mode 600, dir is mode 700"
echo "  rclone lsf ${RCLONE_CRYPT_REMOTE}:portfolio-backups  # filenames should be unrecognizable base32, not portfolio_*.sql.gz"
