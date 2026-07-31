// Mutation testing scope for backend/ — see ../.cursor/rules/mutation-testing.mdc
// for the full rationale. Deliberately NOT the whole `src/` tree:
//
// - Excludes everything that hits the real Postgres (auth/{auth-service,
//   session,create-admin-user}.ts, content/{document,site-content,work,posts,
//   admin-posts,admin-work}.ts) — those integration tests already run with
//   `fileParallelism: false` because they share DB state (see
//   vitest.config.ts), so rerunning them once per mutant would be extremely
//   slow and would surface DB flakiness as mutation-testing flakiness.
// - Also excludes content/{locale,localized-text,site-content-defaults}.ts:
//   verified (by grep) to have zero `prisma`/`db/client` imports themselves,
//   BUT they have no dedicated unit test of their own either — they're only
//   exercised indirectly through the DB-backed site-content.test.ts /
//   work.test.ts. Mutating them would either need those DB tests to run
//   anyway (defeating the exclusion above) or show every mutant as
//   uncovered. Real candidates once/if they get direct unit tests.
//   content/slug.ts graduated OUT of this exclusion (2026-07-31) once
//   `generateUniqueSlug` got its own DB-free unit test (slug.test.ts,
//   injected `isTaken` predicate instead of a real Prisma call).
// - Everything listed below was verified (by grep) to have zero `prisma`/
//   `db/client` imports AND has its own dedicated, DB-free test file — see
//   errors.ts, which does import `Prisma` from `@prisma/client` for
//   `instanceof` error classification only (no query, no live DB needed by
//   its tests).
//
// vitest.configFile points at a dedicated config, not vitest.config.ts — see
// vitest.mutation.config.ts's comment for why (a real bug found by running
// this for the first time, not a stylistic choice).
//
// thresholds.break was set from the first real baseline run against this
// exact file list (see backend/README.md's dated entry for the actual
// mutation score) — not a guessed number.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
    testRunner: "vitest",
    vitest: {
        configFile: "vitest.mutation.config.ts",
    },
    mutate: [
        "src/auth/password.ts",
        "src/auth/tokens.ts",
        "src/auth/jwt.ts",
        "src/auth/rate-limit.ts",
        "src/content/reading-time.ts",
        "src/content/blocks.ts",
        "src/content/lifecycle.ts",
        "src/content/slug.ts",
        "src/content/slugify.ts",
        "src/errors.ts",
    ],
    reporters: ["html", "clear-text", "progress"],
    // Speeds up the run — Stryker's own warning flagged static mutants
    // (module-load-time code) as ~92% of the runtime here for only 18% of
    // the mutants.
    ignoreStatic: true,
    // Real baseline (2026-07-27, see backend/README.md's dated entry): 100%
    // (212/212 non-ignored mutants killed, 6 documented-equivalent mutants
    // ignored). `break` set a bit below that as real headroom for future
    // code, not at 100 — a single new line of untested logic shouldn't fail
    // every PR outright, but a real regression should still fail the build.
    thresholds: {
        high: 90,
        low: 75,
        break: 75,
    },
};

export default config;
