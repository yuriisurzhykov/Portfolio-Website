import { defineContract } from "@portfolio/design-tokens";

/**
 * The one place color's required global-semantic role list lives — derived
 * from what `shared/ui/**`'s Tailwind classes actually consume (the
 * already-reviewed `ARCHITECTURE.md` role set), not invented. `defineTheme`
 * (see `themes/dark.ts`/`light.ts`) checks every theme against this the
 * moment its module is imported; `RequiredShape<typeof colorContract>`
 * derives the matching TS type from this SAME array, so there's no second,
 * hand-kept-in-sync interface anywhere.
 *
 * Deliberately does NOT include `decorativeAccent` or anything
 * component-specific (`code*`, `codePanel*`) — those are either optional
 * global roles (added directly to the theme objects, not required here) or
 * component tokens (`components/*.ts`), which have no contract at all.
 */
export const colorContract = defineContract({
    category: "color",
    required: [
        "surfacePrimary",
        "surfaceElevated",
        "surfaceRaised",
        "surfaceSubtle",
        "surfaceIcon",
        "surfaceRowHover",
        "surfaceOverlay",
        "surfaceInverse",
        "surfacePlaceholderPrimary",
        "surfacePlaceholderSecondary",

        "textPrimary",
        "textSecondary",
        "textMuted",
        "textFaint",
        "textChip",
        "textInverse",
        "textAccent",
        "textOnBrand",

        "borderSubtle",
        "borderDefault",
        "borderStrong",
        "borderConnector",
        "borderFocus",

        "interactivePrimary",
        "interactivePrimaryHover",
        "interactivePrimarySubtle",

        "statusSuccess",
        "statusSuccessSubtle",
        "statusWarning",
        "statusWarningSubtle",
        "statusDanger",
        "statusForeground",
    ],
});
