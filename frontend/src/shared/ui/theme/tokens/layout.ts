import { definePrimitives } from "@portfolio/design-tokens";

/**
 * Page-structural constants (content max-widths, navbar height, ...) —
 * not a color/dimension/radius/typography/motion/shadow scale, so there's
 * no separate primitive-vs-semantic split here: these role-shaped names
 * (`contentMaxWidth`, `navbarHeight`, ...) ARE the concrete values, same
 * as `tokens/typography.ts`'s `size` keys. No contract/semantic layer for
 * the same reason — nothing above this references these through another
 * layer, only real components, directly.
 *
 * Compiled under the category key `"layout"` (see `compiler.config.ts`)
 * so the generated variable is `--ds-layout-content-max-width` — matching
 * exactly the class-facing name (`--layout-content-max-width`, used via
 * Tailwind's `max-w-(--layout-content-max-width)` arbitrary-value syntax
 * across a dozen+ views) that `adapters/tailwind.css` bridges to, so no
 * call site needed to change.
 */
export const layout = definePrimitives({
    contentMaxWidth: "75rem",       // 1280px
    contentMaxWidthWide: "90rem",   // 1440px  (unused by this design, kept for future pages)
    contentStandard: "60rem",       // 960px  (to be used by any page that falls back to standard sizing)
    contentNarrow: "68.75rem",      // 1100px  (All Work ledger)
    contentReading: "47.5rem",      // 760px   (Blog Post)
    contentJournal: "51.25rem",     // 820px   (All Journal)
    sectionVerticalPadding: "6rem",
    navbarHeight: "5rem",
    // A one-off structural constant, same category as navbarHeight above —
    // not a spacing/padding value, so it doesn't belong in `tokens/dimension.ts`.
    heroGraphHeight: "26.25rem",    // 420px  (Hero's ProjectGraph decoration)
});
