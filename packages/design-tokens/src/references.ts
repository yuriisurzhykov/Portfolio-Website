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

const TOKEN_REFERENCE = /\{([^}]+)}/g;
const ALPHA_CALL = /^alpha\(\{([^}]+)},\s*([\d.]+)%\)$/;

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

/** Resolves every `{path}` / `alpha({path}, N%)` occurrence inside a string, recursively (a semantic role's value can itself be another reference — the normal "theme role points at a primitive" case). */
export function resolveString(value: string, registry: Registry, seen: ReadonlySet<string> = new Set()): string {
    const alphaMatch = value.match(ALPHA_CALL);
    if (alphaMatch) {
        const [, path, percent] = alphaMatch;
        return `color-mix(in srgb, ${ resolveReference(path, registry, seen) } ${ percent }%, transparent)`;
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
