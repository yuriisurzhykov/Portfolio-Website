import { defineComponentTokens } from "@portfolio/design-tokens";

/**
 * `CodeBlock`'s own vocabulary — deliberately parked out of `tokens/color.ts`
 * and `themes/*.ts` by `ARCHITECTURE.md` ("a single component's vocabulary
 * living in the shared primitive/semantic tier... needs a real
 * component-token design first"). This is that design, and the first real
 * consumer of the component-semantic layer.
 *
 * Every color here goes STRAIGHT to a primitive, never through
 * `{theme.color.*}` (except `className`, see below) — code panels stay
 * dark regardless of the active site theme (the FlowBus.kt sample keeps
 * its dark "terminal" look on both the light and dark page), so routing
 * through a theme-reactive role would be actively wrong here, not just
 * unnecessary indirection.
 *
 * `className` is the one exception, and the reason is a real DS201 promotion,
 * not a style choice: this token and `components/skill-card.ts`'s
 * `accentIcon` both used to reach for `{color.accent.purple}` directly —
 * `npm run tokens:check` failed with "DS201 Primitive color.accent.purple
 * crosses component/composite domain boundaries" the moment both existed.
 * Decided it genuinely IS one shared meaning ("the site's one decorative
 * violet accent, used sparingly") rather than a coincidence — promoted to
 * `theme.color.decorativeAccent` (see `themes/shared-roles.ts`) and
 * repointed both consumers at the new role instead of the primitive.
 */
export const codeBlockTokens = defineComponentTokens("codeBlock", {
    background: "{color.neutral.900}",
    border: "{color.overlayWhite.8}",
    hoverBackground: "alpha({color.neutral.0}, 6%)",
    title: "{color.neutral.400}",
    copyText: "{color.neutral.300}",
    copyTextHover: "{color.neutral.50}",
    code: "{color.neutral.100}",
    lineNumber: "{color.neutral.400}",

    // Syntax highlighting. `keyword` deliberately goes through
    // `{theme.color.interactivePrimary}` rather than `{color.brand.500}`
    // directly — a real DS201 crossing (`composites/shadows.ts` also
    // reaches for the brand primitive), and `interactivePrimary` already
    // exists and means exactly this ("the brand accent"). Safe here
    // specifically because `interactivePrimary` resolves to the SAME value
    // in both themes (see `themes/shared-roles.ts`), so this doesn't
    // accidentally make the invariant code panel theme-reactive.
    keyword: "{theme.color.interactivePrimary}",
    string: "{color.success.500}",
    number: "{color.warning.500}",
    className: "{theme.color.decorativeAccent}",
    function: "{color.accent.blue}",
    property: "{color.accent.blue}",
    punctuation: "{color.neutral.300}",
    comment: "{color.neutral.500}",
});
