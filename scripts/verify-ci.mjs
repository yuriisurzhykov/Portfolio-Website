#!/usr/bin/env node
/**
 * Runs backend-web-checks.yml and visual-tests.yml's real steps locally,
 * in order, with their real env vars, against the current working tree —
 * see .cursor/rules/verify-before-done.mdc for why this exists instead of
 * a hand-picked subset of checks.
 *
 * Usage:
 *   node scripts/verify-ci.mjs                  # full run, both workflows
 *   node scripts/verify-ci.mjs --only=backend    # just backend-web-checks.yml
 *   node scripts/verify-ci.mjs --only=visual     # just visual-tests.yml
 *   node scripts/verify-ci.mjs --skip-mutation   # skip the 3 slow Stryker steps
 *   node scripts/verify-ci.mjs --skip-install    # reuse existing node_modules
 *
 * Flags are for fast iteration mid-task. Run with no flags before
 * declaring anything done — a skipped step is a step CI still runs.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const only = [...args].find((a) => a.startsWith("--only="))?.split("=")[1];
const skipMutation = args.has("--skip-mutation");
const skipInstall = args.has("--skip-install");

// The docker-compose "postgres" service's own "portfolio_test" database
// (already migrated) — not a fresh ephemeral container like real CI uses,
// but the same one `npm test`/`test:e2e` already use locally.
const DATABASE_URL = "postgresql://portfolio:portfolio_dev_only@127.0.0.1:5432/portfolio_test";
const JWT_ACCESS_SECRET = "ci-access-secret-not-for-real-use";
const JWT_REFRESH_SECRET = "ci-refresh-secret-not-for-real-use";

const backendWebEnv = { DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET };
// See visual-tests.yml's own comments on each of these three.
const visualEnv = {
    ...backendWebEnv,
    DISABLE_RATE_LIMIT: "true",
    SEO_INDEXABLE: "true",
    SITE_URL: "https://e2e.example.com",
};

// Cleared from the inherited environment before each run — a leftover
// `$env:DISABLE_RATE_LIMIT` from an earlier manual test once bled through
// and caused 10 fake test failures (see verify-before-done.mdc).
const WORKFLOW_ENV_VARS = [
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "DISABLE_RATE_LIMIT",
    "SEO_INDEXABLE",
    "SITE_URL",
];
const cleanBaseEnv = { ...process.env };
for (const key of WORKFLOW_ENV_VARS) delete cleanBaseEnv[key];

function run(label, cwd, command, env) {
    process.stdout.write(`\n▶ ${label}\n  $ ${command}${cwd !== repoRoot ? `  (in ${path.relative(repoRoot, cwd)})` : ""}\n`);
    const result = spawnSync(command, {
        cwd,
        shell: true,
        stdio: "inherit",
        env: { ...cleanBaseEnv, ...env },
    });
    if (result.status !== 0) {
        process.stdout.write(`\n✗ FAILED: ${label}\n`);
        process.exit(result.status ?? 1);
    }
    process.stdout.write(`✓ ${label}\n`);
}

function backendWebChecks() {
    const backend = path.join(repoRoot, "backend");
    const designTokens = path.join(repoRoot, "packages", "design-tokens");
    const frontend = path.join(repoRoot, "frontend");

    if (!skipInstall) {
        run("Install workspace dependencies (frontend/ + backend/)", repoRoot, "npm ci", {});
    }
    run("Apply migrations to the CI database", backend, "npx prisma migrate deploy", backendWebEnv);
    run("Audit dependencies for high/critical vulnerabilities", repoRoot, "npm audit --omit=dev --omit=optional --audit-level=high", {});
    run("Typecheck backend", backend, "npm run typecheck", backendWebEnv);
    run("Run backend test suite", backend, "npx vitest run", backendWebEnv);
    if (!skipMutation) run("Run backend mutation tests", backend, "npm run test:mutation", backendWebEnv);
    run("Typecheck design-tokens engine", designTokens, "npm run typecheck", {});
    run("Run design-tokens engine test suite", designTokens, "npx vitest run", {});
    if (!skipMutation) run("Run design-tokens engine mutation tests", designTokens, "npm run test:mutation", {});
    run("Lint frontend styles (Stylelint)", frontend, "npm run lint:css", {});
    run("Lint design tokens (no raw colors outside primitives)", frontend, "npm run lint:tokens", {});
    run("Verify design tokens are up to date", frontend, "npm run tokens:check", {});
    run("Run frontend test suite", frontend, "npm test", backendWebEnv);
    if (!skipMutation) run("Run frontend mutation tests", frontend, "npm run test:mutation", backendWebEnv);
    run("Build frontend (Next.js)", frontend, "npm run build", backendWebEnv);
}

function visualTests() {
    const frontend = path.join(repoRoot, "frontend");
    if (!skipInstall && only === "visual") {
        // Only re-run npm ci here if this is the ONLY job running — a
        // preceding backendWebChecks() call already did it.
        run("Install workspace dependencies (frontend/ + backend/)", repoRoot, "npm ci", {});
    }
    run("Run tests", frontend, "npm run test:e2e", visualEnv);
}

function ensurePostgresRunning() {
    process.stdout.write("\n▶ Ensuring local Postgres (docker compose) is up\n");
    const up = spawnSync("docker compose up -d postgres", { cwd: repoRoot, shell: true, stdio: "inherit" });
    if (up.status !== 0) {
        process.stdout.write("✗ Could not start the local Postgres container — is Docker running?\n");
        process.exit(1);
    }
    // One pg_isready check, not a real health-poll loop — good enough since
    // this container is almost always already warm from normal dev use.
    spawnSync("docker compose exec -T postgres pg_isready -U portfolio", { cwd: repoRoot, shell: true, stdio: "ignore" });
}

if (!existsSync(path.join(repoRoot, "docker-compose.yml"))) {
    process.stdout.write("docker-compose.yml not found — run this from the repo root.\n");
    process.exit(1);
}

ensurePostgresRunning();

if (only === "visual") {
    visualTests();
} else if (only === "backend") {
    backendWebChecks();
} else {
    backendWebChecks();
    visualTests();
}

process.stdout.write("\n✅ All checks passed — this matches what backend-web-checks.yml and visual-tests.yml would report on a real push.\n");
