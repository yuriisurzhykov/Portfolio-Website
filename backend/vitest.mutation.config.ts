import { defineConfig } from "vitest/config";

/**
 * A dedicated Vitest config for mutation testing (see stryker.config.mjs) —
 * not vitest.config.ts.
 *
 * Wrong turn, found by actually running Stryker (not assumed): pointing
 * `stryker.config.mjs`'s `vitest.configFile` at the normal `vitest.config.ts`
 * made Stryker's initial "dry run" (which vitest-runner needs to build its
 * per-test mutant coverage map, required by `coverageAnalysis: "perTest"`)
 * execute the FULL discovered test suite exactly like `vitest run` would —
 * including the real-Postgres integration tests. The `vitest.related` option
 * only limits which tests rerun for an individual *mutant* afterwards, not
 * what the dry run itself executes. Result: mutation testing failed outright
 * with no local Postgres running, which defeats the entire point of scoping
 * `mutate` to pure-logic files in the first place.
 *
 * Fix: point Stryker at this config instead, whose `include` is the explicit
 * list of pure-logic test files — vitest then never discovers/runs the
 * DB-backed integration tests during the dry run, so no live Postgres is
 * needed at all to run `npm run test:mutation`.
 *
 * Keep this `include` list in sync with `stryker.config.mjs`'s `mutate`
 * list: every mutated file needs its dedicated test(s) discoverable here, or
 * its mutants get zero coverage and "survive" for the wrong reason.
 */
export default defineConfig({
    test: {
        setupFiles: ["./vitest.setup.ts"],
        include: [
            "src/auth/password.test.ts",
            "src/auth/tokens.test.ts",
            "src/auth/jwt.test.ts",
            "src/auth/rate-limit.test.ts",
            "src/content/reading-time.test.ts",
            "src/content/blocks.test.ts",
            "src/content/lifecycle.test.ts",
            "src/content/slug.test.ts",
            "src/content/slugify.test.ts",
            "src/errors.test.ts",
        ],
    },
});
