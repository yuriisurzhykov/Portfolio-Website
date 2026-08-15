import { defineComposite } from "@portfolio/design-tokens";

/**
 * Semantic text-style bundles over `tokens/typography.ts`'s primitives —
 * structure only for this pass, ported from `ARCHITECTURE.md`'s section
 * 3.5. Deliberately NOT wired into `Text.tsx` yet: `shared/ui/theme/typography.ts`
 * (a separate, pre-existing file — note the different path, no `tokens/`
 * or `composites/` segment) already defines `Text.tsx`'s real, currently-
 * consumed variant styles, using fluid `clamp()` sizes that were never
 * part of `tokens.ts`'s fixed typography scale to begin with. Reconciling
 * the two is a real design decision (which fluid/fixed sizes actually
 * become the source of truth), not plumbing — left as documented future
 * work rather than silently forcing a component-visible change into a
 * structure-first pass.
 */
export const typographyStyles = defineComposite("typographyStyle", {
    hero: {
        size: "{typography.size.hero}",
        weight: "{typography.weight.bold}",
        lineHeight: "{typography.lineHeight.tight}"
    },
    display: {
        size: "{typography.size.display}",
        weight: "{typography.weight.bold}",
        lineHeight: "{typography.lineHeight.tight}"
    },
    h1: {
        size: "{typography.size.h1}",
        weight: "{typography.weight.bold}",
        lineHeight: "{typography.lineHeight.tight}"
    },
    h2: {
        size: "{typography.size.h2}",
        weight: "{typography.weight.semibold}",
        lineHeight: "{typography.lineHeight.tight}"
    },
    h3: {
        size: "{typography.size.h3}",
        weight: "{typography.weight.semibold}",
        lineHeight: "{typography.lineHeight.tight}"
    },
    bodyLg: {
        size: "{typography.size.bodyLg}",
        weight: "{typography.weight.regular}",
        lineHeight: "{typography.lineHeight.normal}"
    },
    body: {
        size: "{typography.size.body}",
        weight: "{typography.weight.regular}",
        lineHeight: "{typography.lineHeight.normal}"
    },
    caption: {
        size: "{typography.size.caption}",
        weight: "{typography.weight.regular}",
        lineHeight: "{typography.lineHeight.normal}"
    },
    micro: {
        size: "{typography.size.micro}",
        weight: "{typography.weight.medium}",
        lineHeight: "{typography.lineHeight.normal}"
    },
});
