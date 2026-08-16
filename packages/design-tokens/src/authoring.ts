/**
 * The actual reusable "define a design token system" API. Every layer is
 * CREATED through one of these functions, not assembled as a plain object
 * and validated separately afterward — so a missing required key throws
 * the moment a `defineTheme()` call runs (at module-import time: `next
 * dev` startup, or the first test touching the module), not only when a
 * build script remembers to invoke a checker. Same pattern vanilla-extract's
 * `createThemeContract()`/`createTheme()` uses for this exact problem.
 */
import { assertRequiredKeys, validateNoSemanticToSemanticRefs } from "./validate";
import type {
    ComponentLayer,
    CompositeLayer,
    Contract,
    PrimitiveLayer,
    RequiredShape,
    SemanticLayer,
    TokenTree,
} from "./types";

/**
 * Primitives have no contract at all — see the plan's "extend" section:
 * they're addressed only through `{category.path}` reference strings,
 * never a hardcoded Tailwind class name, so nothing constrains their shape
 * beyond "a tree of scalars." The return type is deliberately the GENERIC
 * `PrimitiveLayer<TokenTree>`, not `PrimitiveLayer<T>` — every authoring
 * function in this file widens its result the same way, so a specific
 * project's literal shape (checked against `T` on the way IN) doesn't
 * fight TypeScript's index-signature variance rules on the way back OUT,
 * once it's stored in a generic container like `CompilerInput.primitives`.
 */
export function definePrimitives<T extends TokenTree>(tree: T): PrimitiveLayer<TokenTree> {
    return Object.freeze({ ...tree, __kind: "primitive" });
}

/**
 * The ONE place a category's required-role list lives. `RequiredShape<>`
 * (types.ts) derives the matching TS type straight from this same
 * `required` array, so there is never a hand-kept-in-sync interface
 * alongside a hand-kept-in-sync runtime list.
 */
export function defineContract<const TRequired extends readonly string[]>(config: {
    readonly category: string;
    readonly required: TRequired;
}): Contract<TRequired[number]> {
    return Object.freeze({ category: config.category, required: config.required }) as Contract<TRequired[number]>;
}

/**
 * Builds one global-semantic layer against a contract. Used ONCE per flat
 * (no theme-axis) category (e.g. `semantic/radius.ts`), or once PER THEME
 * NAME for a themed category (e.g. `themes/dark.ts` + `themes/light.ts`,
 * each a separate `defineTheme()` call assembled by the project's own
 * `themes/index.ts`) — "theme" here names the common USE CASE, not a
 * distinct code path; a flat category just happens to call this once.
 */
export function defineTheme<C extends Contract<string>, T extends RequiredShape<C>>(
    contract: C,
    roles: T & Record<string, unknown>,
): SemanticLayer<TokenTree> {
    const label = `defineTheme("${contract.category}")`;
    assertRequiredKeys(roles, contract.required, label);
    validateNoSemanticToSemanticRefs(roles, label);
    return Object.freeze({ ...roles, __kind: "semantic", __category: contract.category });
}

/** No required contract at all, by design — every component decides its own shape freely; not writing one breaks nothing. */
export function defineComponentTokens<T extends TokenTree>(namespace: string, tokens: T): ComponentLayer<TokenTree> {
    return Object.freeze({ ...tokens, __kind: "component", __namespace: namespace });
}

/** Composites (gradients/shadows/typography-styles/transitions) follow the same reference rules as global semantics (primitive or global-semantic only) but have no required-key contract — a project either has a `hero` gradient or it doesn't. */
export function defineComposite<T extends TokenTree>(kind: string, recipe: T): CompositeLayer<TokenTree> {
    validateNoSemanticToSemanticRefsAllowed(recipe, kind);
    return Object.freeze({ ...recipe, __kind: "composite", __compositeKind: kind });
}

/**
 * Composites are allowed to reference `{theme.*}`/`{semantic.*}` (a
 * gradient stop legitimately points at a theme role, e.g.
 * `{theme.color.interactivePrimaryHover}` in this project's real `glow`
 * gradient) — DS004 only forbids a global-SEMANTIC layer referencing
 * another semantic role, never a composite doing so. This function exists
 * so that intent is a named, documented no-op instead of silently just
 * "not calling validateNoSemanticToSemanticRefs."
 */
function validateNoSemanticToSemanticRefsAllowed(_recipe: TokenTree, _kind: string): void {
    // Intentionally empty — see doc comment above.
}
