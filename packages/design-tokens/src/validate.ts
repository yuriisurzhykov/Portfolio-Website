/**
 * The DS0xx rule family — reference/format/required-key/direction checks.
 * DS1xx/DS2xx (unused-global, single-consumer, primitive-boundary-crossing
 * promotion analysis) live in usage-graph.ts instead, since they need the
 * whole graph, not one tree at a time.
 */
import { collectReferences, getByPath } from "./references";
import type { TokenTree } from "./types";

export class TokenValidationError extends Error {}

/** DS002 — every `{path}`/`alpha({path}, N%)` reachable from `roots` must resolve inside `registry`. */
export function validateReferences(registry: Record<string, unknown>, roots: readonly TokenTree[]): void {
    const refs = new Set<string>();
    for (const root of roots) collectReferences(root, refs);
    for (const path of refs) {
        if (getByPath(registry, path) === undefined) {
            throw new TokenValidationError(`DS002 Unknown token reference: "{${path}}"`);
        }
    }
}

/**
 * DS005 — every key a contract lists as required must be present (and not
 * `undefined`). Called BY `defineTheme()` at object-construction time (see
 * authoring.ts) — this function existing separately is what lets
 * `tokens:check` re-run it graph-wide as defense-in-depth, not the only
 * place it runs.
 */
export function assertRequiredKeys(tree: TokenTree, required: readonly string[], label: string): void {
    const missing = required.filter((key) => (tree as Record<string, unknown>)[key] === undefined);
    if (missing.length > 0) {
        throw new TokenValidationError(`DS005 ${label} is missing required key(s): ${missing.join(", ")}`);
    }
}

/**
 * DS006 — an OPTIONAL key (one no contract requires) present in some but
 * not all of a set of sibling trees (e.g. dark/light themes) is a real gap
 * DS005 can't see, since DS005 only ever looks at required keys. Warning,
 * not an error: a theme may legitimately not need a decorative role the
 * other one does.
 */
export function checkOptionalKeyParity(trees: Readonly<Record<string, TokenTree>>, requiredKeys: ReadonlySet<string>): string[] {
    const names = Object.keys(trees);
    const allKeys = new Set<string>();
    for (const tree of Object.values(trees)) {
        for (const key of Object.keys(tree)) {
            if (!key.startsWith("__")) allKeys.add(key);
        }
    }
    const warnings: string[] = [];
    for (const key of allKeys) {
        if (requiredKeys.has(key)) continue;
        const present = names.filter((name) => (trees[name] as Record<string, unknown>)[key] !== undefined);
        const missing = names.filter((name) => !present.includes(name));
        if (present.length > 0 && missing.length > 0) {
            warnings.push(`DS006 optional key "${key}" is present in [${present.join(", ")}] but missing from [${missing.join(", ")}]`);
        }
    }
    return warnings;
}

const HSL_COLOR = /^hsl\(/;

/**
 * DS001 (primitive side, color-specific) — every color primitive leaf must
 * be a real `hsl()` string, never a hex/rgb/oklch literal or a bare number.
 * `node` is `unknown`, not `Record<string, unknown>`, and silently returns
 * for anything that isn't a plain object — a project with no color
 * primitives at all (this pass only reviews color; a project could have
 * none) shouldn't force every call site to guard first, the same tolerance
 * `validateNoRawColorLiterals` below already has for `null`/`undefined`.
 */
export function validateColorPrimitiveFormat(node: unknown, path: readonly string[] = []): void {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    for (const [key, value] of Object.entries(node)) {
        if (key.startsWith("__")) continue;
        const currentPath = [...path, key];
        if (typeof value === "string") {
            if (!HSL_COLOR.test(value)) {
                throw new TokenValidationError(`DS001 color primitive "${currentPath.join(".")}" is not a valid hsl() string: "${value}"`);
            }
        } else if (value && typeof value === "object" && !Array.isArray(value)) {
            validateColorPrimitiveFormat(value as Record<string, unknown>, currentPath);
        }
    }
}

// Fully `^...$`-anchored (one whole-string attempt, never retried at another
// position), so unlike `references.ts`'s `TOKEN_REFERENCE` this was never the
// "many repeated positions" ReDoS shape — bounded to `{1,200}` anyway, for the
// same "no unbounded scan inside braces" invariant everywhere in this package.
const REFERENCE_LIKE = /^(\{[^}]{1,200}\}|alpha\(\{[^}]{1,200}\},\s*[\d.]+%\))$/;

/**
 * DS001 (semantic/component/composite side, color-specific for this pass —
 * see the plan's "real scope constraint" audit finding for why dimension/
 * radius/motion/typography don't get this ban yet) — every leaf must be a
 * reference, never a literal value. Concrete colors exist ONLY in a
 * primitive layer.
 */
export function validateNoRawColorLiterals(node: unknown, path: readonly string[] = []): void {
    if (typeof node === "string") {
        if (!REFERENCE_LIKE.test(node)) {
            throw new TokenValidationError(`DS001 raw color literal outside a primitive layer at "${path.join(".")}": "${node}"`);
        }
        return;
    }
    if (typeof node === "number" || node == null) return;
    if (Array.isArray(node)) {
        node.forEach((item, index) => validateNoRawColorLiterals(item, [...path, String(index)]));
        return;
    }
    if (typeof node === "object") {
        for (const [key, value] of Object.entries(node)) {
            if (key.startsWith("__")) continue;
            validateNoRawColorLiterals(value, [...path, key]);
        }
    }
}

/**
 * DS001 (composite side) — walks an arbitrary tree/array and runs
 * `validateNoRawColorLiterals` on every value found under a key literally
 * named "color", ignoring everything else. A composite recipe (a gradient's
 * `stops[].color`, a shadow layer's `layer.color`) mixes a real color
 * reference with structural literals that are valid non-reference strings
 * on purpose (`type: "radial"`, `position: "30% 30%"`) — walking the WHOLE
 * recipe with `validateNoRawColorLiterals` would reject those as false
 * positives. This targets only the field the color actually lives in, by
 * name, which is the one thing every composite shape in this package
 * (`Gradient`'s `stop.color`, `ShadowLayer`'s `layer.color`) has in common —
 * a project's own custom composite kind gets the same coverage for free as
 * long as it names its color field "color" too.
 */
export function validateColorFieldsDeep(node: unknown, path: readonly string[] = []): void {
    if (Array.isArray(node)) {
        node.forEach((item, index) => validateColorFieldsDeep(item, [...path, String(index)]));
        return;
    }
    if (node && typeof node === "object") {
        for (const [key, value] of Object.entries(node)) {
            if (key.startsWith("__")) continue;
            if (key === "color") {
                validateNoRawColorLiterals(value, [...path, key]);
            } else {
                validateColorFieldsDeep(value, [...path, key]);
            }
        }
    }
}

/**
 * DS004 — a global-semantic layer (`defineTheme()`'s output) may only
 * reference primitives, never another semantic role. Deliberately checked
 * only for `__kind: "semantic"` objects: component tokens ARE allowed to
 * reference `{theme.*}` (component semantic may point at a primitive OR a
 * global-semantic role) — see the plan's layering model.
 */
export function validateNoSemanticToSemanticRefs(tree: TokenTree, label: string): void {
    const refs = collectReferences(tree);
    for (const ref of refs) {
        if (ref.startsWith("theme.") || ref.startsWith("semantic.")) {
            throw new TokenValidationError(
                `DS004 ${label} contains a semantic-to-semantic reference: "{${ref}}" — global-semantic tokens may only reference primitives.`,
            );
        }
    }
}

/** DS007 — no two categories may generate the same CSS custom-property name. */
export function validateUniqueVariableNames(names: readonly string[]): void {
    const seen = new Set<string>();
    for (const name of names) {
        if (seen.has(name)) throw new TokenValidationError(`DS007 duplicate generated CSS variable name: "${name}"`);
        seen.add(name);
    }
}
