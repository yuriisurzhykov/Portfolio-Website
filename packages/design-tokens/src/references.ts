import type { TokenTree } from "./types";

export type Registry = Record<string, unknown>;

export class TokenReferenceError extends Error {
}

/** Resolves a dotted path ("color.brand.500") against a registry object. Returns `undefined`, never throws, for a path that doesn't exist — callers decide whether that's an error. */
export function getByPath(registry: Registry, path: string): unknown {
    let current: unknown = registry;
    for (const segment of path.split(".")) {
        if (current == null || typeof current !== "object") return undefined;
        current = (current as Record<string, unknown>)[segment];
    }
    return current;
}

/**
 * `{1,200}`, not `+` — a real ReDoS finding (CodeQL/GitHub Advanced
 * Security, "polynomial regular expression"), fixed here, not dismissed
 * as a false positive: this pattern has the `g` flag and no `^` anchor,
 * so `.test()`/`.replace()`/`.matchAll()` all retry the match at EVERY
 * character position on failure. A string with many repeated, never-closed
 * `{` characters (CodeQL's own reproduction: many repetitions of `"{{|"`)
 * made the unbounded `[^}]+` scan to end-of-string at each one of those
 * O(n) positions — genuinely O(n²). Bounding it caps the work per position
 * to O(1); a real token reference path (`"theme.color.surfacePrimary"`) is
 * nowhere close to 200 characters, so this changes no real behavior.
 */
const TOKEN_REFERENCE = /\{([^}]{1,200})}/g;
/** Anchored `^...$` (a single whole-string match attempt, never retried at another position), so its own `[^}]+` was never the same risk — bounded anyway, for the same invariant everywhere in this file. */
const ALPHA_CALL = /^alpha\(\{([^}]{1,200})},\s*([\d.]+)%\)$/;

function resolveReference(path: string, registry: Registry, seen: ReadonlySet<string>): string {
    if (seen.has(path)) {
        throw new TokenReferenceError(`Circular token reference at "${ path }" (chain: ${ [...seen, path].join(" -> ") })`);
    }
    const resolved = getByPath(registry, path);
    if (resolved === undefined) {
        throw new TokenReferenceError(`Unresolvable token reference: "{${ path }}"`);
    }
    if (typeof resolved !== "string" && typeof resolved !== "number") {
        throw new TokenReferenceError(`Token reference "${ path }" did not resolve to a scalar value (got ${ typeof resolved })`);
    }
    const resolvedString = String(resolved);
    const nextSeen = new Set(seen);
    nextSeen.add(path);
    return isReferenceLike(resolvedString) ? resolveString(resolvedString, registry, nextSeen) : resolvedString;
}

function isReferenceLike(value: string): boolean {
    return ALPHA_CALL.test(value) || TOKEN_REFERENCE.test(resetLastIndex(TOKEN_REFERENCE, value));
}

function resetLastIndex(pattern: RegExp, value: string): string {
    pattern.lastIndex = 0;
    return value;
}

// Anchored `^...$`, single whole-string attempt — matches the shape every
// primitive in this system is validated to have (DS001,
// `validateColorPrimitiveFormat`), optionally already carrying its own
// alpha component (e.g. `overlayWhite.8` = `hsl(0 0% 100% / 8%)`).
const PLAIN_HSL = /^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*(?:\/\s*[\d.]+%\s*)?\)$/;

/**
 * `alpha({color.X}, 12%)` used to compile to `color-mix(in srgb, hsl(...) 12%,
 * transparent)` — valid CSS, but a real, live bug (found running the actual
 * app, not a lint finding): Mermaid's "base" theme runs every themeVariable
 * through its OWN color-math library (it has no CSS engine to lean on), which
 * can parse a plain `hsl()`/`rgb()`/hex string but not a `color-mix()` call —
 * "Unsupported color format" the moment a diagram tried to use
 * `interactivePrimarySubtle`.
 *
 * Fixed at the source, not by working around Mermaid specifically: every
 * color primitive in this system is already an `hsl()` string (DS001), and
 * `hsl()` has its OWN native alpha syntax (`hsl(H S% L% / A%)`) — setting
 * that directly produces a color visually IDENTICAL to
 * `color-mix(in srgb, hsl(H S% L%) A%, transparent)` (both mean "this hue/
 * saturation/lightness, at A% opacity"), except it's a plain color literal
 * every consumer (a browser, Mermaid, this package's own `hslStringToRgb01`)
 * can parse directly — exactly the property `generated/resolved.ts` (read by
 * every non-CSS adapter) needs and `color-mix()` never had.
 * `color-mix()` stays as a defensive fallback for the one case this
 * shouldn't ever hit in practice: a resolved value that ISN'T a plain
 * `hsl()` string despite DS001 — never silently producing a wrong color.
 */
function withAlpha(resolvedColor: string, percent: string): string {
    const match = resolvedColor.match(PLAIN_HSL);
    if (!match) return `color-mix(in srgb, ${ resolvedColor } ${ percent }%, transparent)`;
    const [, h, s, l] = match;
    return `hsl(${ h } ${ s }% ${ l }% / ${ percent }%)`;
}

/** Resolves every `{path}` / `alpha({path}, N%)` occurrence inside a string, recursively (a semantic role's value can itself be another reference — the normal "theme role points at a primitive" case). */
export function resolveString(value: string, registry: Registry, seen: ReadonlySet<string> = new Set()): string {
    const alphaMatch = value.match(ALPHA_CALL);
    if (alphaMatch) {
        const [, path, percent] = alphaMatch;
        return withAlpha(resolveReference(path, registry, seen), percent);
    }
    resetLastIndex(TOKEN_REFERENCE, value);
    return value.replace(TOKEN_REFERENCE, (_match, path: string) => resolveReference(path, registry, seen));
}

/** Recursively resolves every scalar string in a tree; numbers pass through untouched. Authoring tags (`__kind`, `__namespace`, ...) are dropped — they're metadata for the compiler, never a CSS value. */
export function resolveTree<T extends TokenTree>(tree: T, registry: Registry): T {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(tree)) {
        if (key.startsWith("__")) continue;
        if (typeof value === "string") {
            result[key] = resolveString(value, registry);
        } else if (typeof value === "number") {
            result[key] = value;
        } else if (Array.isArray(value)) {
            result[key] = value.map((item) => (item && typeof item === "object" ? resolveTree(item as TokenTree, registry) : item));
        } else if (value && typeof value === "object") {
            result[key] = resolveTree(value as TokenTree, registry);
        } else {
            result[key] = value;
        }
    }
    return result as T;
}

/** Walks a tree collecting every referenced dotted path (without resolving them) — the raw material the usage-graph and reference validators both build on. */
export function collectReferences(node: unknown, refs: Set<string> = new Set()): Set<string> {
    if (typeof node === "string") {
        const alphaMatch = node.match(ALPHA_CALL);
        if (alphaMatch) {
            refs.add(alphaMatch[1]);
            return refs;
        }
        resetLastIndex(TOKEN_REFERENCE, node);
        for (const match of node.matchAll(TOKEN_REFERENCE)) refs.add(match[1]);
        return refs;
    }
    if (Array.isArray(node)) {
        node.forEach((item) => collectReferences(item, refs));
        return refs;
    }
    if (node && typeof node === "object") {
        for (const [key, value] of Object.entries(node)) {
            if (key.startsWith("__")) continue;
            collectReferences(value, refs);
        }
    }
    return refs;
}
