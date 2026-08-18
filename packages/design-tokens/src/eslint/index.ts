/**
 * The design-token governance ESLint plugin. Meant to run via its OWN
 * `lint:tokens` script/CI step, kept separate from the project's general
 * `npm run lint` (which runs `continue-on-error: true` today because of an
 * unrelated 56-error backlog — see the plan's audit finding) so this new,
 * zero-baseline rule set is actually enforced from day one instead of
 * silently riding along inside a non-blocking step.
 *
 * Usage (flat ESLint config):
 *
 *   import designTokens from "@portfolio/design-tokens/eslint-plugin";
 *   export default [
 *     {
 *       files: ["src/**\/*.tsx"],
 *       ignores: ["src/shared/ui/theme/tokens/**"], // the one place literal colors are allowed
 *       plugins: { "design-tokens": designTokens },
 *       rules: {
 *         "design-tokens/no-raw-color-value": "error",
 *         "design-tokens/no-arbitrary-color-class": "error",
 *         "design-tokens/no-raw-dimension-value": "error",
 *         "design-tokens/no-arbitrary-dimension-class": "error",
 *       },
 *     },
 *   ];
 */
// Explicit `.ts` extensions here, deliberately (unlike the rest of this
// package): this module is loaded by ESLint's flat-config loader directly
// through Node's own ESM resolver, not through a bundler (Next.js's
// transpiler / tsx's runtime hooks) the way everything else in this
// package is — and Node's native resolver, unlike a bundler's, requires an
// explicit extension on a relative specifier. Found live: `npm run
// lint:tokens` failed with `ERR_MODULE_NOT_FOUND` without these.
import noArbitraryColorClass from "./no-arbitrary-color-class.ts";
import noArbitraryDimensionClass from "./no-arbitrary-dimension-class.ts";
import noRawColorValue from "./no-raw-color-value.ts";
import noRawDimensionValue from "./no-raw-dimension-value.ts";

const plugin = {
    meta: { name: "@portfolio/design-tokens", version: "0.0.1" },
    rules: {
        "no-raw-color-value": noRawColorValue,
        "no-arbitrary-color-class": noArbitraryColorClass,
        "no-raw-dimension-value": noRawDimensionValue,
        "no-arbitrary-dimension-class": noArbitraryDimensionClass,
    },
};

export default plugin;
export { noArbitraryColorClass, noArbitraryDimensionClass, noRawColorValue, noRawDimensionValue };
