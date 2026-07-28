// Mutation testing scope for web/ — see ../.cursor/rules/mutation-testing.mdc
// for the full rationale. Deliberately NOT the whole `src/` tree:
//
// - Excludes jsdom-rendered React component tests (Drawer, Nav, StatusToggle,
//   Markdown, AdminListItem, IconRefPreview, I18nContext) and DOM-listener
//   hooks (useHideOnScroll) — a documented v1 scope limit for speed/stability
//   (mutating + rerunning through jsdom is slower and noisier than plain
//   function logic), not a statement that UI logic doesn't deserve it.
//   Expanding this list later is a legitimate follow-up.
// - Everything listed below is plain, DOM-free logic.
//
// thresholds.break was set from the first real baseline run against this
// exact file list (see web/README.md's dated entry for the actual mutation
// score) — not a guessed number.
// vitest.configFile points at a dedicated config, not vitest.config.ts — see
// vitest.mutation.config.ts's comment for why (the same real bug found
// while setting up backend/'s mutation testing, not a stylistic choice):
// Stryker's dry run runs whatever that config discovers, not just files
// related to `mutate`, so pointing it at the normal config would pull in
// every jsdom component test this scope deliberately excludes.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
    testRunner: "vitest",
    vitest: {
        configFile: "vitest.mutation.config.ts",
    },
    mutate: [
        "src/shared/lib/date-format.ts",
        "src/shared/lib/slugify.ts",
        "src/shared/i18n/engine/LocaleRegistry.ts",
        "src/shared/i18n/engine/index.ts",
        "src/shared/ui/block-editor/convert.ts",
    ],
    reporters: ["html", "clear-text", "progress"],
    // Speeds up the run (Stryker's own warning: static mutants dominated
    // the runtime here) — see date-format.ts's module-level `Intl.
    // DateTimeFormat` construction, whose mutants are effectively
    // untestable in isolation anyway (see the wrong-turn note in
    // web/README.md's dated entry: a bad option there throws at import
    // time, crashing the whole test file instead of failing one test, so
    // per-mutant analysis can't isolate it).
    ignoreStatic: true,
    // Real baseline (2026-07-27, see web/README.md's dated entry): 100%
    // (131/131 non-ignored mutants killed, 23 documented-equivalent/static
    // mutants ignored). `break` set a bit below that as real headroom, not
    // at 100 — see backend/stryker.config.mjs's identical reasoning.
    thresholds: {
        high: 90,
        low: 75,
        break: 75,
    },
};

export default config;
