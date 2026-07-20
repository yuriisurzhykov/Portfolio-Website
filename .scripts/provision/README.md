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
