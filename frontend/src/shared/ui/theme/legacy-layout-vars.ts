import { layout, zIndex } from "./legacy-tokens";

/**
 * `layout`/`zIndex` are page-structural constants (content max-widths,
 * navbar height, stacking order), not one of this architecture's
 * categories (color/dimension/radius/typography/motion/shadow) — genuinely
 * out of scope for this migration, not an oversight. Still real, actively
 * consumed CSS variables (`Nav.tsx`, `Hero.tsx`, `Drawer.tsx`, and a dozen
 * more), so this is the one deliberately-kept sliver of the old
 * runtime-injected `<style>` mechanism — everything color/dimension/
 * radius/typography/motion-related now comes from the static
 * `generated/tokens.css` import instead (see `app/styles/index.css`).
 */
export const legacyLayoutVars = `
  :root {
    --layout-content-max-width: ${ layout.contentMaxWidth };
    --layout-content-max-width-wide: ${ layout.contentMaxWidthWide };
    --layout-content-narrow: ${ layout.contentNarrow };
    --layout-content-reading: ${ layout.contentReading };
    --layout-content-journal: ${ layout.contentJournal };
    --layout-section-vertical-padding: ${ layout.sectionVerticalPadding };
    --layout-navbar-height: ${ layout.navbarHeight };
    --layout-hero-graph-height: ${ layout.heroGraphHeight };

    --z-background: ${ zIndex.background };
    --z-content: ${ zIndex.content };
    --z-snackbar: ${ zIndex.snackbar };
    --z-navbar: ${ zIndex.navbar };
    --z-overlay: ${ zIndex.overlay };
  }
`;
