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

/** DS001 (primitive side, color-specific) — every color primitive leaf must be a real `hsl()` string, never a hex/rgb/oklch literal or a bare number. */
export function validateColorPrimitiveFormat(node: Record<string, unknown>, path: readonly string[] = []): void {
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

const REFERENCE_LIKE = /^(\{[^}]+\}|alpha\(\{[^}]+\},\s*[\d.]+%\))$/;

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
