import { definePrimitives } from "@portfolio/design-tokens";

/**
 * Stacking order roles. Compiled under the category key `"z"` (see
 * `compiler.config.ts`), not `"zIndex"` — so the generated variable is
 * `--ds-z-navbar`, matching the REAL Tailwind utility class name
 * (`z-navbar`, used in `Nav.tsx`/`Drawer.tsx`/`BackToTop.tsx`/...)
 * `adapters/tailwind.css` bridges to. Unlike `layout.ts`'s values (read
 * via an arbitrary-value `var()` reference, never registered as a named
 * Tailwind utility), these MUST be inside a real `@theme` block for
 * Tailwind to generate `.z-navbar { z-index: ... }` at all.
 */
export const zIndex = definePrimitives({
    background: 0,
    content: 10,
    navbar: 20,
    snackbar: 50,
    overlay: 100,
});
