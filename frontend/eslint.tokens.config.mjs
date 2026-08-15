import { globalIgnores } from "eslint/config";
import tseslintParser from "@typescript-eslint/parser";
import designTokens from "@portfolio/design-tokens/eslint-plugin";

/**
 * Deliberately does NOT import `eslint-config-next` at all — found live,
 * not assumed: the version actually installed here (`^0.2.4`, per
 * `package.json`) resolves to a completely unrelated, years-old package
 * with no `./core-web-vitals`/`./typescript` subpath exports
 * (`ERR_MODULE_NOT_FOUND` the first time this config tried to import it —
 * confirmed by reading `node_modules/eslint-config-next/package.json`,
 * whose `description` is "ESLint configuration using Babel parser..." —
 * never going to be the real Next.js config). Fixing that pin for real is
 * a separate, already-flagged pre-existing-backlog task (see the plan's
 * audit finding) — this config has to work independent of it either way.
 *
 * Uses `@typescript-eslint/parser` directly (not through eslint-config-next)
 * so `.tsx`/generics/etc. actually parse.
 *
 * Rule names from `react-hooks`/`@next/next`/etc. are NOT registered
 * here, so an `eslint-disable-next-line react-hooks/...` comment
 * elsewhere in the codebase would normally make ESLint itself report
 * "Definition for rule ... was not found" as an error under this config
 * specifically (found live running this for the first time).
 * `noInlineConfig` sidesteps it by making every inline directive a no-op —
 * safe here because with no `react-hooks`/`@next/next` rules loaded in
 * THIS config there's nothing for those disable comments to have been
 * suppressing anyway. Trade-off, stated plainly: a future
 * `// eslint-disable-next-line design-tokens/...` comment would ALSO be
 * inert under this config — use `ignores` in this file instead of an
 * inline comment for a genuine exception.
 */
export default [
    globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
    {
        files: ["src/**/*.{ts,tsx}"],
        // The one place literal color values are allowed (primitives) — and the
        // generated output, a build artifact never hand-edited.
        ignores: ["src/shared/ui/theme/tokens/color.ts", "src/shared/ui/theme/generated/**"],
        languageOptions: {
            parser: tseslintParser,
            parserOptions: { ecmaFeatures: { jsx: true } },
        },
        linterOptions: { noInlineConfig: true },
        plugins: { "design-tokens": designTokens },
        rules: {
            "design-tokens/no-raw-color-value": "error",
            "design-tokens/no-arbitrary-color-class": "error",
        },
    },
];
