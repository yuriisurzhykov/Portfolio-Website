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
    // Fluid (rem + vw, never vh — see theme/README.md's dated entry on the
    // same convention for typography). Bounds carried over from what was
    // ALREADY independently hand-copied as `px-[clamp(...)]` across Nav,
    // Hero, TechStack, Principles, ContactCta, JournalPreview — not
    // invented. `sectionHorizontalPadding` consolidates Nav's one 16px-min
    // outlier (the other 5 all used 20px) to the majority value; the
    // difference is 4px, imperceptible.
    sectionHorizontalPadding: "clamp(1.25rem, 0.5rem + 3.75vw, 3.5rem)",
    // The narrower padding WorkDetailPage/JournalDetailPage/JournalListPage
    // use for their reading column — a real, distinct pattern from the
    // section padding above, not the same value repeated.
    readingHorizontalPadding: "clamp(1.25rem, 1.17rem + 0.42vw, 1.5rem)",
    readingTopPadding: "clamp(3rem, 2.33rem + 3.33vw, 5rem)",
    navbarHeight: "5rem",
    // A one-off structural constant, same category as navbarHeight above —
    // not a spacing/padding value, so it doesn't belong in `tokens/dimension.ts`.
    heroGraphHeight: "26.25rem",    // 420px  (Hero's ProjectGraph decoration)
    // `DiagramBlock.tsx`'s source-code `<Editor>` (react-simple-code-editor)
    // only accepts a `style` prop, no `className` — so this can't use
    // Tailwind's built-in numeric spacing scale (`min-h-32`) the way every
    // other single-use dimension in this migration did; referenced via
    // `var(--ds-layout-code-editor-min-height)` directly in inline style
    // instead. No existing dimension step is close enough to substitute
    // (6xl is 96px, 32px short of the 128px an editor needs to show a
    // handful of real diagram-source lines without feeling cramped).
    codeEditorMinHeight: "8rem",    // 128px
});
