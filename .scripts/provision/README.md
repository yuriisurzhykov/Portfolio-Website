# `.scripts/provision/` — idempotent VPS setup scripts

These scripts codify Phase 6 of
`.cursor/plans/database-backed_cms_migration_59a172e7.plan.md` (VPS
hardening & deploy pipeline). They exist because this project's owner plans
to migrate to a new VPS (new IP) at some point — these scripts are what makes
that a re-run instead of a from-memory redo of every manual step.

## How this directory came to exist

Each script here was **not** written speculatively. The workflow for every
step was: run the real commands by hand on the actual VPS over SSH, inspect
the real output, confirm the invariant holds (e.g. "Postgres really is
bound to `127.0.0.1` only") — and only then transcribe that verified step
into an idempotent script and commit it. This matters because an
IaC/provisioning script that has never actually been run end-to-end against
a real box is exactly the kind of thing that turns out to be broken the one
time you need it (disaster recovery, new server). See the repo's
`.cursor/rules/development-methodology.mdc` — "Never trust 'should work.'"

## Conventions

- Numbered filenames (`01-`, `02-`, ...) — run in order on a fresh box.
- Every script is **idempotent**: safe to re-run on a box that's already
  partially or fully provisioned (checks current state before acting,
  doesn't blindly re-install/re-create).
- Every script uses `set -euo pipefail` and fails loudly (non-zero exit) on
  any unexpected state, rather than silently continuing — a provisioning
  script that "mostly worked" is worse than one that stopped and told you
  exactly what was wrong.
- Secrets (DB passwords, JWT secrets) are **never** hardcoded here — they're
  generated interactively or read from environment variables at run time,
  never committed. See the app's `.env` handling in a later script.
- These scripts assume Ubuntu 24.04 (the actual target VPS OS, confirmed via
  `lsb_release -a`) — not written to be distro-agnostic, since there's
  exactly one real target.

## Scripts

- `01-postgres-install.sh` — installs PostgreSQL 16 from Ubuntu's default
  apt repo (matches the major version used in the repo-root
  `docker-compose.yml` for local dev) and verifies it's bound to
  `127.0.0.1`/`localhost` only, with no wide-open `pg_hba.conf` rules. This
  is a security invariant, not a nice-to-have, so the script exits non-zero
  (refuses to continue) rather than warning-and-proceeding if either check
  fails.
- `02-postgres-db.sh` — creates the dedicated `portfolio` role + database
  (not a superuser, no `CREATEDB`/`CREATEROLE`) that the app connects as.
  Reads the new role's password from `PORTFOLIO_DB_PASSWORD` (generate with
  `openssl rand -hex 32` — hex, not base64, so it never needs URL-encoding
  inside a `postgresql://` connection string) rather than hardcoding a
  secret in a committed file. Never resets an existing role's password on
  re-run.
- `03-nodejs-install.sh` — installs Node.js 20 LTS via NodeSource, matching
  the `node-version: 20` used by
  `.github/workflows/backend-web-checks.yml`. Ubuntu's default apt repo
  version (18.x) is deliberately not used — same "match CI/dev exactly"
  reasoning as the Postgres major-version pin above.
- `04-app-user.sh` — creates the `nextapp` system account (no shell, no
  home, not in `sudo`) that the systemd service runs as — kept separate
  from the SSH/deploy account (`yuriisoft`, which has `sudo`) so that a
  compromised app process can't reach root via `sudo`.
- `05-app-dirs.sh` — creates `${APP_BASE_DIR}/{releases,shared}` (default
  `/srv/apps/yuriisoft-web`), parallel to `/srv/apps/yuriisoft` (the old
  frontend static site's release directory — cutover at nginx already
  happened, so that directory is now dead weight pending manual removal on
  the VPS, not something still being served). `shared/` (mode 700,
  owned by `nextapp`) is where the persistent `.env` lives across every
  future release — see `06-app-env.sh`. Parameterized via `APP_BASE_DIR` so
  the same script also provisions a separate dev/staging rehearsal target
  (`APP_BASE_DIR=/srv/apps/yuriisoft-web-dev`) — see "Dev/staging rehearsal
  environment" below.
- `06-app-env.sh` — writes `${APP_BASE_DIR}/shared/.env` (`DATABASE_URL`,
  `JWT_ACCESS_SECRET`) from env vars passed at run time, owned by
  `nextapp`, mode 600 (unreadable to the deploy account itself). No longer
  asks for a `JWT_REFRESH_SECRET` (removed during the OWASP audit
  remediation — nothing in the app ever read it; refresh tokens are opaque
  CSPRNG strings, never JWTs) and refuses a `JWT_ACCESS_SECRET` under 32
  characters. Refuses to overwrite an existing file — resetting these values
  by accident invalidates every live session or breaks the DB connection
  silently. Also parameterized via `DB_NAME` (default `portfolio`) for the
  same dev/staging reason.

  **Adding/updating a key later** (e.g. `UPSTASH_REDIS_REST_URL`/`_TOKEN`
  for `backend/src/auth/rate-limit.ts`, added after this file already
  exists) is a different operation — not "run 06 again" (it refuses on
  purpose), and not something the deploy account can do by hand either:
  `shared/` is mode 700 owned by `nextapp` — `yuriisoft` has no access to
  it at all, not even to list the directory. That restriction is
  deliberate and applies the same way to CI as to a human — neither gets
  more than a narrow sudoers grant over one fixed root script. See
  `12-set-app-env-helper.sh` below (installs that grant, one time) and
  `../set-app-env-finish.sh` (the script the grant covers). The **primary**
  way this gets invoked day to day is `.github/workflows/deploy-web.yaml`'s
  "Sync optional env vars" steps, automatically, on every deploy, from
  GitHub Actions secrets — `../set-app-env.sh` (run from your own machine)
  is a manual fallback for a one-off value, not the normal path.

- `07-swap.sh` — adds a 2 GiB swapfile. The VPS has 1.8 GiB RAM and shipped
  with zero swap — without it, a brief memory spike (npm installing native
  deps, a build, a traffic burst) gets hard-killed by the OOM killer
  instead of just running slower. Not in the plan's Phase 6 bullet list
  verbatim, but squarely "VPS hardening" and cheap (disk is not scarce
  here).
- `08-systemd-service.sh` — installs/enables a systemd unit for one Next.js
  target (`SERVICE_NAME`/`APP_BASE_DIR`/`PORT` params). Hardening
  directives (`NoNewPrivileges`, `PrivateTmp`, `ProtectHome`,
  `ProtectSystem=strict`, and — added during the OWASP audit remediation —
  `RestrictAddressFamilies`, `ProtectKernelTunables`,
  `ProtectControlGroups`, `RestrictSUIDSGID`) were verified incrementally
  against the real `yuriisoft-web-dev` service — one group at a time —
  before being combined here; see the commit history for each step's live
  confirmation. Does not itself start/restart the service.

  **Binding Next.js to localhost only:** `next start` defaults to
  `0.0.0.0`, meaning the app is reachable directly on the VPS's public
  interface if the firewall doesn't stop it — bypassing nginx's TLS,
  security headers, and login rate-limit zone entirely. The first fix
  attempted here was `Environment=HOSTNAME=127.0.0.1` in this unit file —
  **wrong**, found by reading Next.js 16's actual CLI source
  (`packages/next/src/bin/next.ts`): the `start` command's `-H,
  --hostname` option has no `.env()` binding (unlike `-p, --port`, which
  does), so `process.env.HOSTNAME` is silently ignored outside an
  `output: "standalone"` build, which this app doesn't use. The real fix
  is in `frontend/package.json`'s `start` script
  (`next start -H 127.0.0.1`) instead — see that file and `14-ufw.sh`
  below for the firewall half of the same fix.

  **2026-08-11 — caught by code review:** `ProtectSystem=strict` with no
  `ReadWritePaths=` refuses every write outside the sandbox (`EROFS`), and
  this unit had none, even though `generateCoverForWork`/`generateCoverForPost`
  write new covers to `shared/media` at runtime by the time this was
  flagged — the original comment justifying `strict` ("never uses
  next/image, no server-side runtime disk writes") had gone stale.
  Added `ReadWritePaths=${APP_BASE_DIR}/shared`, covering both
  `shared/media` and the newer `shared/.cache` (fontconfig). A target
  provisioned before this fix needs `08-systemd-service.sh` re-run AND an
  explicit `sudo systemctl restart <service>` — sandboxing directives only
  take effect from the process's next start, `daemon-reload` alone does
  not retroactively apply them to an already-running process.

- `09-nginx-rate-limit-zone.sh` — installs the shared `login_limit`
  `limit_req_zone` (10r/m per IP) in `/etc/nginx/conf.d/`, protecting
  `/api/auth/login` — a second, independent layer in front of the
  app-level lockout that already existed in
  `backend/src/auth/rate-limit.ts` since Phase 2 (that file's own comment
  anticipates this exact script). Verified live: a 15-request burst
  against `dev.yuriisoft.me` returned `401` (real app rejection) for the
  first 6, then `429` (nginx, never reached the app) for the rest.
- `10-nginx-site.sh` — generates/installs an nginx reverse-proxy site
  config (`SITE_NAME`/`DOMAIN`/`PORT`/optional `EXTRA_SERVER_NAMES`)
  pointing at one Next.js target, with the rate-limited
  `/api/auth/login` location from the zone above. Assumes an existing
  Certbot cert for `DOMAIN`. Never runs `nginx -t`/reload itself —
  verifying and reloading stays an explicit, separate step every time.

  **Security headers (added during the OWASP audit remediation):**
  `Strict-Transport-Security` and `Permissions-Policy` are sent
  enforcing from the start (both are additive-only — no existing page
  relies on being framed, geolocated, or served over plain HTTP).
  `Content-Security-Policy` ships as `-Report-Only` deliberately: its
  directive set (`script-src 'self'`, `style-src 'self' 'unsafe-inline'`
  for Mantine/BlockNote's runtime `<style>` injection and the root
  layout's own design-token `<style>` tag, `img-src ... https:` for
  admin-authored image/icon URLs) was derived by reading
  `frontend/src/**` for every inline-script/external-CDN dependency, not
  by trial and error against a live site — reading the dependencies is
  necessary but not sufficient. Before promoting it to a real
  `Content-Security-Policy` header (drop `-Report-Only` from the
  directive name in this script), load `/admin`'s block editor against
  the deployed report-only policy and confirm the browser console shows
  zero violation reports first — the same live-verification bar every
  other rule in this file already cleared.

- `12-set-app-env-helper.sh` — installs `/usr/local/bin/
  set-app-env-finish.sh` (root-owned, from `../set-app-env-finish.sh`) and a
  narrow sudoers NOPASSWD rule (`/etc/sudoers.d/set-app-env`) letting
  `yuriisoft` run exactly that one binary — the same privilege-split
  reasoning as `deploy-web-finish.sh`'s own sudoers rule (one fixed,
  auditable script instead of broad sudo over `cp`/`chown`/`systemctl`).
  **Must be run with real (not narrowly-scoped) sudo** — it's the thing
  that CREATES the narrow grant, so the narrow grant can't bootstrap it.
  One-time step per box; every `../set-app-env.sh` call afterwards goes
  through this grant instead of needing a human with real sudo each time.
  Validates the generated sudoers file with `visudo -c` before it ever
  touches `/etc/sudoers.d/` — a syntax error dropped straight into that
  directory can break `sudo` for every user on the box, including root's
  own way of fixing it.

- `11-pg-backup.sh` — nightly `pg_dump` (via `/root/.pgpass`, no password
  on the command line) → gzip → 14-day local rotation → `rclone sync`,
  ENCRYPTED, to Google Drive, wired into `/etc/cron.d/pg-backup` (3am
  daily). Requires `rclone config` to have been run TWICE already (see the
  script's own header): once for the plain "gdrive" remote, once more for
  a "gdrive-crypt" remote layered on top of it — that step is
  interactive/one-time and deliberately not automated. **Known follow-up**:
  currently uses rclone's shared Google Drive `client_id`, which rclone's
  own CLI warns is being retired during 2026 — deferred to get production
  live first; replace with a self-created OAuth client_id
  (https://rclone.org/drive/#making-your-own-client-id) before then.

  **Encryption + permissions (added during the OWASP audit remediation,
  F6):** before this, a dump sat on disk mode 644 (root's default umask —
  any other local user on the box could read the whole database) and left
  the box in PLAINTEXT over `rclone sync`, readable by anyone with access
  to the Google Drive folder or a compromised shared `client_id`. The
  generated inner script now sets `umask 077` before creating anything and
  `chmod 600` on the dump explicitly (belt-and-braces — the umask alone
  would already cover it, but doesn't rely on no future refactor moving
  file creation earlier than the umask line), and syncs through the new
  crypt remote instead of the plain one. Verified live end-to-end
  (2026-08-06): a real `pg_dump | gzip` from the local dev database was
  pushed through a real rclone crypt remote (wrapping a local directory
  standing in for Google Drive — the crypt mechanism itself is identical
  regardless of the underlying storage backend) and confirmed genuinely
  encrypted at rest (raw bytes start with rclone's own "RCLONE" header, not
  the gzip magic number; filenames are unrecognizable base32, not
  `portfolio_<timestamp>.sql.gz`), then copied back through the same crypt
  remote and decompressed — byte-for-byte identical to the original
  (SHA-256 match), with valid, readable SQL inside. `umask 077`/`chmod 600`
  were separately verified against a real Linux container (`stat -c '%a'`
  showing `700`/`600` exactly as intended).

- `14-ufw.sh` — enables `ufw` with a default-deny-incoming policy, allowing
  only SSH (`SSH_PORT`, default 22), HTTP, and HTTPS from outside. Added
  during the OWASP audit remediation: none of the scripts above actually
  closed the VPS's public interface to Next.js's own port (3000/3001),
  Postgres (5432), or PlantUML (8081) — those were only ever protected by
  the app/service itself binding to `127.0.0.1`, which is one layer, not
  two. Ordering inside the script is deliberate (SSH allowed before the
  default-deny policy is set, which is set before `ufw enable`) so a
  mistake can't lock out the very SSH session running it.

- `16-deploy-finish-helper.sh` — installs `/usr/local/bin/deploy-frontend-finish.sh`
  (root-owned, from `../deploy-frontend-finish.sh`) and a narrow sudoers
  NOPASSWD rule (`/etc/sudoers.d/deploy-frontend-finish`) letting
  `yuriisoft` run exactly that one binary — same reasoning, same pattern
  as `12-set-app-env-helper.sh`. **Written after finding, live, that this
  script had no installer at all**: its first install (then named
  `deploy-web-finish.sh`) was done by hand during the original Phase 6
  bring-up and never got backfilled into a script, so every later edit to
  it silently stayed on the VPS's own copy until someone remembered to
  manually `sudo cp` the new version over — found when a real edit to
  `deploy-frontend-finish.sh` (the `shared/.cache/fontconfig` self-heal,
  see `../deploy-frontend-finish.sh`'s own dated comment) had no way to
  reach the VPS at all. One-time step per box; every future edit to
  `deploy-frontend-finish.sh` after this is a single re-run of this
  script, no sudoers work needed again.

  Getting THIS script (and the rest of `provision/`) onto the VPS in the
  first place never requires a git checkout there: `deploy-target.yml`'s
  "Sync deploy/provisioning scripts" step scp's this whole directory to
  `~/deploy-scripts/.scripts/provision/` on every deploy, so it's always
  present and current — just SSH in and run it from there.

- `15-session-cleanup-cron.sh` — installs a nightly cron job (2am, one
  hour offset from `11-pg-backup.sh`'s 3am) that runs `backend/scripts/
  cleanup-expired-sessions.ts` as `nextapp`, deleting `Session` rows that
  expired more than a week ago. Added during the OWASP audit remediation:
  the `Session` table otherwise grows forever, since refresh-token
  rotation revokes an old row but never deletes it. Parameterized the same
  way `05-app-dirs.sh`/`06-app-env.sh` are (`APP_BASE_DIR`/`SERVICE_LABEL`)
  so dev and prod each get their own cron file.

  **Fixed by review, not by running it:** the first version logged to
  `/var/log/session-cleanup-*.log`. A cron.d line's `user` field controls
  who runs the WHOLE command string, including any `>> file` redirection
  written into it — so that log file would have been opened by `nextapp`,
  which has no write access to root-owned `/var/log`, and nothing in the
  script ever pre-created/chowned it either. The nightly job would have
  failed with "Permission denied" on its very first real run, silently
  cleaning up nothing, forever. Fixed by logging into
  `${APP_BASE_DIR}/shared/` instead — `nextapp` already owns that whole
  directory (`05-app-dirs.sh`), so no pre-creation step is needed at all.

## Real CI/CD (post-bring-up)

Once the whole pipeline had been proven manually end to end (dev, then
prod), it was wired into real automation:
`.github/workflows/deploy-web.yaml` builds once on every push, then
deploys to `dev.yuriisoft.me` on a push to `master` or to `yuriisoft.me` on
a `v*` tag push — using `.scripts/deploy-web.sh` (parallel to the existing
`.scripts/deploy.sh` for `frontend/`, but with the extra steps a database-
backed app needs: wiring `shared/.env` into the release and running
`prisma migrate deploy` before restarting the systemd service, instead of
just reloading nginx). Superseded the earlier manual/diagnostic
`build-web-artifact.yml` (removed).

## Dev/staging rehearsal environment

Before ever running a migration or a first `next start` against the real
production database, the whole pipeline (migrate → systemd → nginx) is
proven end-to-end against `dev.yuriisoft.me` first — an already-existing
domain/vhost, with its own Let's Encrypt cert, currently serving a static
preview build. It gets its own real (not fake/local) Postgres database
(`portfolio_dev`, same non-superuser `portfolio` role, just a second
database), its own `.env` (own JWT secrets — dev and prod never share
one), its own release directory (`/srv/apps/yuriisoft-web-dev`), and its
own Next.js process on a different port (3001, vs. 3000 for production) —
so a broken rehearsal run can never touch real content or the live site.
`05-app-dirs.sh`/`06-app-env.sh` take `APP_BASE_DIR`/`DB_NAME` precisely so
this doesn't require a duplicate set of scripts.
