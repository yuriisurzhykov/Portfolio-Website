/**
 * The promotion-graph analysis — DS101/102/201/202/203. Every function here
 * operates on plain (namespace, tree) pairs, never on a hardcoded category
 * or role name: a "namespace" is just a string the caller assigns
 * (`component:codeBlock`, `composite:gradients`, ...), read off each
 * object's own `__namespace`/`__compositeKind` tag by the compiler
 * (compile.ts), not inferred from a file path.
 *
 * DS202 ("primitive used by component + global composite") and DS201
 * ("primitive used by 2 components") collapse into ONE function here,
 * deliberately: both are "a primitive is consumed directly by 2+
 * independent bounded domains," and the fix is identical either way — this
 * is a simplification over the original two-rule split, not a missed case.
 *
 * DS203 ("repeated primitive inside ONE namespace: fine") needs no code at
 * all — it's simply the absence of a violation when a primitive has
 * exactly one consuming namespace.
 */
import { collectReferences } from "./references";
import type { TokenTree } from "./types";

export interface NamespacedTree {
    readonly namespace: string;
    readonly tree: TokenTree;
}

export interface PrimitiveBoundaryCrossing {
    readonly primitivePath: string;
    readonly consumers: readonly string[];
}

export interface SingleConsumerGlobal {
    readonly semanticPath: string;
    readonly consumer: string;
}

const THEME_OR_SEMANTIC = /^(theme|semantic)\./;

/** path -> set of namespaces that reference it directly (one hop, not resolved). */
export function buildConsumerReferenceMap(consumers: readonly NamespacedTree[]): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>();
    for (const { namespace, tree } of consumers) {
        for (const ref of collectReferences(tree)) {
            let namespaces = map.get(ref);
            if (!namespaces) {
                namespaces = new Set();
                map.set(ref, namespaces);
            }
            namespaces.add(namespace);
        }
    }
    return map;
}

/** DS201/202 — a primitive path referenced directly by 2+ distinct component/composite namespaces. */
export function findPrimitiveBoundaryCrossings(consumers: readonly NamespacedTree[]): PrimitiveBoundaryCrossing[] {
    const map = buildConsumerReferenceMap(consumers);
    const violations: PrimitiveBoundaryCrossing[] = [];
    for (const [path, namespaces] of map) {
        if (THEME_OR_SEMANTIC.test(path)) continue;
        if (namespaces.size >= 2) {
            violations.push({ primitivePath: path, consumers: [...namespaces].sort() });
        }
    }
    return violations.sort((a, b) => a.primitivePath.localeCompare(b.primitivePath));
}

/** DS102 — a global-semantic role (`theme.*`/`semantic.*`) referenced directly by exactly one component/composite namespace. */
export function findSingleConsumerGlobals(consumers: readonly NamespacedTree[]): SingleConsumerGlobal[] {
    const map = buildConsumerReferenceMap(consumers);
    const violations: SingleConsumerGlobal[] = [];
    for (const [path, namespaces] of map) {
        if (!THEME_OR_SEMANTIC.test(path)) continue;
        if (namespaces.size === 1) {
            violations.push({ semanticPath: path, consumer: [...namespaces][0] });
        }
    }
    return violations.sort((a, b) => a.semanticPath.localeCompare(b.semanticPath));
}

/** DS101 — a global-semantic role that no component/composite consumer references at all (warn, not error: a brand-new role may just not have a consumer YET). */
export function findUnusedGlobalSemantics(definedPaths: readonly string[], consumers: readonly NamespacedTree[]): string[] {
    const map = buildConsumerReferenceMap(consumers);
    return definedPaths.filter((path) => !map.has(path) || map.get(path)!.size === 0);
}
