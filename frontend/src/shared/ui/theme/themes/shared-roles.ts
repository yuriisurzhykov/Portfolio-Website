/**
 * Global-semantic color roles that are IDENTICAL in both themes — factored
 * out once and merged into each theme's own role object via
 * `mergeTokenTree()`, instead of hand-copying the same `{ref}` string into
 * `dark.ts` AND `light.ts` (real, existing duplication in the pre-migration
 * `tokens.ts`'s `buildColors()` — see the plan's "override" mechanism).
 *
 * `decorativeAccent` is new here, not carried over from `ARCHITECTURE.md`:
 * it's the actual, live promotion this migration triggered — see
 * `components/code-block.ts` and `components/skill-card.ts`'s own
 * comments for the DS201 story (two component namespaces reached for
 * `{color.accent.purple}` directly; promoted to this shared role instead
 * of leaving either as a coincidence).
 */
export const sharedColorRoles = {
    borderFocus: "{color.brand.500}",
    interactivePrimary: "{color.brand.500}",
    interactivePrimarySubtle: "alpha({color.brand.500}, 12%)",

    statusSuccess: "{color.success.500}",
    statusSuccessSubtle: "alpha({color.success.500}, 12%)",
    statusWarning: "{color.warning.500}",
    statusWarningSubtle: "alpha({color.warning.500}, 12%)",
    statusDanger: "{color.danger.500}",
    statusForeground: "{color.neutral.950}",

    textOnBrand: "{color.neutral.950}",

    decorativeAccent: "{color.accent.purple}",
} as const;
