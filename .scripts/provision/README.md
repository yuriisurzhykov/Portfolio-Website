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
  `/srv/apps/yuriisoft-web`), parallel to the existing `/srv/apps/yuriisoft`
  (frontend static site, untouched until cutover). `shared/` (mode 700,
  owned by `nextapp`) is where the persistent `.env` lives across every
  future release — see `06-app-env.sh`. Parameterized via `APP_BASE_DIR` so
  the same script also provisions a separate dev/staging rehearsal target
  (`APP_BASE_DIR=/srv/apps/yuriisoft-web-dev`) — see "Dev/staging rehearsal
  environment" below.
- `06-app-env.sh` — writes `${APP_BASE_DIR}/shared/.env` (`DATABASE_URL`,
  `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) from env vars passed at run
  time, owned by `nextapp`, mode 600 (unreadable to the deploy account
  itself). Refuses to overwrite an existing file — resetting these values
  by accident invalidates every live session or breaks the DB connection
  silently. Also parameterized via `DB_NAME` (default `portfolio`) for the
  same dev/staging reason.

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
- `07-swap.sh` — adds a 2 GiB swapfile. The VPS has 1.8 GiB RAM and shipped
  with zero swap — without it, a brief memory spike (npm installing native
  deps, a build, a traffic burst) gets hard-killed by the OOM killer
  instead of just running slower. Not in the plan's Phase 6 bullet list
  verbatim, but squarely "VPS hardening" and cheap (disk is not scarce
  here).
