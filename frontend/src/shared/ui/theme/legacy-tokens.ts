/**
 * LEGACY — trimmed down (2026-08-14) to only what's genuinely still needed.
 * Every color/spacing/radius/typography/motion/shadow export this file
 * used to have (`colors`, `colorsLight`, `palette`, `darkPalette`,
 * `lightPalette`, `radii`, `spacing`, `typography`, `motion`, `shadows`,
 * `blur`, the aggregated `tokens`/`DesignTokens` type) is GONE — fully
 * superseded by `tokens/`, `themes/`, `components/`, `composites/` in this
 * same directory, compiled into `generated/tokens.css` /
 * `generated/resolved.ts`. Nothing imports any of those old exports
 * anymore (verified: `MermaidDiagram.tsx` and `seo/og/render.tsx`, the
 * last 2 real consumers, were migrated to `shared/ui/theme/adapters/` in
 * the same change that added this comment).
 *
 * `layout`/`zIndex` are the one deliberately-kept exception: page-
 * structural constants (content max-widths, navbar height, stacking
 * order), not one of this architecture's categories
 * (color/dimension/radius/typography/motion/shadow) — genuinely out of
 * scope for the design-token migration, not an oversight. Still real,
 * actively consumed CSS variables (`Nav.tsx`, `Hero.tsx`, `Drawer.tsx`,
 * and a dozen more) via `legacy-layout-vars.ts`'s runtime-injected
 * `<style>` tag — the one remaining sliver of the pre-migration mechanism.
 */
export const layout = {
    contentMaxWidth: "80rem",       // 1280px
    contentMaxWidthWide: "90rem",   // 1440px  (unused by this design, kept for future pages)
    contentNarrow: "68.75rem",      // 1100px  (All Work ledger)
    contentReading: "47.5rem",      // 760px   (Blog Post)
    contentJournal: "51.25rem",     // 820px   (All Journal)
    sectionVerticalPadding: "6rem",
    navbarHeight: "5rem",
    // A one-off structural constant, same category as navbarHeight above —
    // not a spacing/padding value, so it doesn't belong in `spacing`.
    heroGraphHeight: "26.25rem",    // 420px  (Hero's ProjectGraph decoration)
};

export const zIndex = {
    background: 0,
    content: 10,
    navbar: 20,
    snackbar: 50,
    overlay: 100,
};
