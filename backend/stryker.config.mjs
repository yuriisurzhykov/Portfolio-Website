// Mutation testing scope for backend/ — see ../.cursor/rules/mutation-testing.mdc
// for the full rationale. Deliberately NOT the whole `src/` tree:
//
// - Excludes everything that hits the real Postgres (auth/{auth-service,
//   session,create-admin-user}.ts, content/{document,site-content,work,posts,
//   admin-posts,admin-work,content-draft,slug-history}.ts) — those
//   integration tests already run with `fileParallelism: false` because
//   they share DB state (see vitest.config.ts), so rerunning them once per
//   mutant would be extremely slow and would surface DB flakiness as
//   mutation-testing flakiness. `content-draft.ts` joined this list
//   2026-08-09 (draft/publish split) for the same reason `slug-history.ts`
//   already was here — its own logic (upsert/prune/restore) is thin
//   enough that its real value is only proven by content-draft.test.ts's
//   integration tests, same as slug-history.test.ts. `draft-blocks.ts`
//   (pure — no Prisma import) is the one new file from that same change
//   that DID get added below, since it has its own DB-free unit test.
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
//   its tests). The five media/*.ts files (2026-08-10, procedural post
//   covers) joined the list the same way: cover-seed/cover-hue/
//   cover-palette/cover-composition/content-hash have zero `prisma` imports
//   and each has its own unit-test file. `covers.ts` (DB-backed:
//   `resolveCategoryHue`/`generateCoverForPost` read and write
//   `CategoryHue`/`MediaAsset`) and `image-generator.ts`/`media-store.ts`/
//   `image-processing.ts` (env-factories and a real `sharp` call — not
//   pure, and already covered by their own real-DB/real-sharp integration
//   tests) are deliberately NOT here, same reasoning as `admin-posts.ts`.
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
        "src/content/draft-blocks.ts",
        "src/content/lifecycle.ts",
        "src/content/slug.ts",
        "src/content/slugify.ts",
        "src/content/tech-slug.ts",
        "src/errors.ts",
        "src/media/cover-seed.ts",
        "src/media/cover-hue.ts",
        "src/media/cover-palette.ts",
        "src/media/cover-composition.ts",
        "src/media/content-hash.ts",
        // 2026-08-10, "Generative Cover System v3 — Organic" rewrite: same
        // rule as the five files above (zero `prisma`/`db/client` imports,
        // each with its own dedicated, DB-free test file). `cover-fonts.ts`
        // is DELIBERATELY excluded (real `fs.readFile` I/O, tested via its
        // own live-file-read integration test, same reasoning as
        // `image-processing.ts`).
        "src/media/cover-xml.ts",
        "src/media/cover-smooth-path.ts",
        "src/media/cover-text-stats.ts",
        "src/media/cover-text-measure.ts",
        "src/media/cover-flow.ts",
        "src/media/cover-wave.ts",
        "src/media/cover-letterform.ts",
        "src/media/cover-title-text.ts",
        "src/media/cover-stamp.ts",
        "src/media/cover-font-face.ts",
    ],
    reporters: ["html", "clear-text", "progress"],
    // Speeds up the run — Stryker's own warning flagged static mutants
    // (module-load-time code) as ~92% of the runtime here for only 18% of
    // the mutants.
    ignoreStatic: true,
    // Real baseline (2026-07-27, see backend/README.md's dated entry): 100%
    // (212/212 non-ignored mutants killed, 6 documented-equivalent mutants
    // ignored).
    //
    // Updated baseline (2026-08-10, "Generative Cover System v3 —
    // Organic" rewrite added 10 new pure files): 96.31% overall, 94.66%
    // for media/ specifically. Every NEW file this rewrite touched reached
    // 100% (cover-composition/-flow/-font-face/-letterform/-smooth-path/
    // -stamp/-text-measure/-text-stats/-title-text/-wave.ts) — the
    // remaining gap is entirely `cover-hue.ts` (73.40%, 25 survived),
    // pre-existing debt from before this rewrite, left untouched and out
    // of this change's scope; a real future task, not silently fixed here.
    // `break` set a bit below the real number as headroom for future code,
    // not at 100 — a single new line of untested logic shouldn't fail
    // every PR outright, but a real regression should still fail the build.
    thresholds: {
        high: 95,
        low: 85,
        break: 85,
    },
};

export default config;
