import type { TokenTree } from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recursive, override-wins merge — the mechanism behind "override" and
 * "extend" (see the plan's "Required vs. optional tokens" section):
 * `defineTheme(contract, mergeTokenTree(sharedRoles, perThemeRoles))` lets
 * two themes share identical roles (`statusSuccess`, `borderFocus`, ...)
 * without hand-copying them into both files.
 *
 * Deliberately typed as two INDEPENDENT type parameters (`TBase`,
 * `TOverrides`), not `overrides: DeepPartial<TBase>` — an earlier version
 * used `DeepPartial<TBase>`, which only allows overriding keys `base`
 * ALREADY has. That fits "same shape, some values differ" but not this
 * function's real, primary use case here: `sharedColorRoles` and a
 * theme's OWN roles are mostly DISJOINT key sets being combined into one
 * object, not one overriding the other — `TBase & TOverrides` allows both.
 *
 * Arrays and scalars are replaced wholesale by the override, never merged
 * element-wise — a gradient's stop list or a shadow's layer list is one
 * unit of meaning, not something to splice together from two sources.
 */
export function mergeTokenTree<TBase extends TokenTree, TOverrides extends TokenTree>(
    base: TBase,
    overrides: TOverrides,
): TBase & TOverrides {
    const result: Record<string, unknown> = { ...base };
    for (const [key, overrideValue] of Object.entries(overrides as Record<string, unknown>)) {
        if (overrideValue === undefined) continue;
        const baseValue = (base as Record<string, unknown>)[key];
        result[key] = isPlainObject(baseValue) && isPlainObject(overrideValue)
            ? mergeTokenTree(baseValue as TokenTree, overrideValue as TokenTree)
            : overrideValue;
    }
    return result as TBase & TOverrides;
}
