import { JetBrains_Mono, Public_Sans } from "next/font/google";

/**
 * Self-hosted (Next.js downloads and serves these at build time — no
 * runtime request to fonts.googleapis.com, no render-blocking network
 * hop). Found live, not assumed: neither font was ever actually wired up
 * anywhere in this codebase before — `typography.ts`'s `family.body`/
 * `family.mono` only ever named these fonts as quoted strings with no
 * `@font-face`/`next/font`/self-hosted package behind them, so every page
 * had always silently rendered in the `system-ui`/`monospace` fallback
 * instead. See `theme/README.md`'s dated entry for how this was found (a
 * flaky visual-regression test, not a design review).
 *
 * `weight: "variable"` for both — both are real variable fonts (confirmed
 * against `next/font/google`'s own generated type signatures, not
 * assumed), so this loads ONE file covering the full weight range this
 * project's `typography.weight` scale needs (400-800) instead of 5
 * separate static-weight files.
 *
 * `variable: "--font-public-sans"` / `"--font-jetbrains-mono"` — applied
 * to `<html>` in the root layout (and `global-error.tsx`'s own standalone
 * `<html>`, which bypasses the root layout on a root-level crash) via
 * `.variable`, so `typography.ts`'s `family.body`/`family.mono` can
 * reference `var(--font-public-sans)`/`var(--font-jetbrains-mono)`
 * directly instead of a hardcoded quoted name.
 *
 * `display: "optional"`, not the more common `"swap"` — found live as a
 * contributing cause of a recurring Playwright visual-regression flake
 * (see `shared/theme/README.md`'s dated entry): `"swap"` has an
 * INDEFINITE swap window, so the browser can replace the fallback with
 * the real font at any later point, even mid-way through Playwright's
 * two-consecutive-stable-screenshot check, under CI CPU pressure.
 * `"optional"` bounds this to a short (~100ms), deterministic block
 * period with NO later swap: for a self-hosted font (no CDN latency to
 * hedge against, unlike the common case `"swap"` is designed for), the
 * font is either ready almost immediately, or the page commits to the
 * fallback for that whole navigation and never swaps later — removing
 * the open-ended timing window entirely rather than just widening a
 * timeout around it.
 */
export const publicSans = Public_Sans({
    subsets: ["latin"],
    weight: "variable",
    display: "optional",
    variable: "--font-public-sans",
});

export const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin", "cyrillic"],
    weight: "variable",
    display: "optional",
    variable: "--font-jetbrains-mono",
});
