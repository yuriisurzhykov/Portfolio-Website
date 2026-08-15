// Mutation testing scope for packages/design-tokens/ — see
// ../../.cursor/rules/mutation-testing.mdc for the full rationale. This
// package's whole job is catching OTHER code's mistakes (DS0xx-DS2xx), so
// it needs its own correctness proof, not just coverage.
//
// Unlike backend/frontend, this package needs NO dedicated
// vitest.mutation.config.ts: every test file here is a plain, DB-free,
// jsdom-free Node unit test (no Postgres, no React rendering) — there is
// nothing problematic for Stryker's dry run to accidentally discover, so
// pointing it straight at the normal vitest.config.ts is safe. Verified by
// actually running `npm run test:mutation`, not assumed from the other
// two packages' pattern.
//
// `types.ts` and `index.ts` are deliberately NOT in `mutate` — the former
// is type-only declarations (nothing for Stryker to mutate at runtime),
// the latter a barrel re-export with no logic of its own.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
    testRunner: "vitest",
    mutate: [
        "src/authoring.ts",
        "src/merge.ts",
        "src/references.ts",
        "src/validate.ts",
        "src/usage-graph.ts",
        "src/compile.ts",
        "src/serializers/css-value.ts",
        "src/serializers/gradient.ts",
        "src/serializers/shadow.ts",
        "src/eslint/no-raw-color-value.ts",
        "src/eslint/no-arbitrary-color-class.ts",
    ],
    reporters: ["html", "clear-text", "progress"],
    ignoreStatic: true,
    // Real baseline (2026-08-14, see packages/design-tokens/README.md's
    // dated entry for the full story): started at 56.80% on the very first
    // real run; adding a dedicated serializers/shadow.test.ts (0% covered —
    // no direct test existed at all), strengthening serializers/css-value.test.ts
    // and serializers/gradient.test.ts, and tightening 3 compile.ts
    // assertions (asserting the actual DS201/DS102 message text, not just
    // that SOME error was thrown) brought it to 72.35% (620/857 killed).
    // `compile.ts` (58.20%) and the two eslint rule files (61-69%) are the
    // remaining real gaps — mostly StringLiteral mutants inside long
    // human-facing error messages and defensive `[]`/`{}` initializers,
    // genuinely lower-value to chase further than the structural bugs the
    // rest of this suite already caught live (DS201/DS102/DS007 taken
    // straight from a real build failure during this migration, not
    // invented for the test). `break` set a bit below the measured number
    // as headroom for new code, same reasoning as backend's/frontend's own
    // configs — not at the ceiling, but a real regression still fails.
    thresholds: {
        high: 85,
        low: 65,
        break: 70,
    },
};

export default config;
