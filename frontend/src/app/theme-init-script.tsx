import { THEME_STORAGE_KEY } from "@/shared/theme";

/**
 * Renders a synchronous, blocking `<script>` that runs during HTML
 * parsing — before hydration even starts, before the browser's first
 * paint — and applies the stored/system theme directly to `<html>`'s
 * classList. This is the ONLY thing that actually closes the "flash of
 * wrong theme" race: `shared/theme/theme.context.tsx`'s own React effects
 * run after hydration AND after the first paint, which
 * `page.waitForLoadState("networkidle")` (used throughout the Playwright
 * suite) never waits for — see `shared/theme/README.md`'s dated entry for
 * the full story of how this was found (a recurring, timing-dependent
 * visual-regression flake, not a design review) and why a cookie +
 * server-side `cookies()` read was considered and rejected (it would
 * revive the exact cache-poisoning risk `proxy.ts`'s locale-header
 * comment already documents from a real incident, and Next.js's own docs
 * confirm it opts the route out of static prerendering).
 *
 * Placed directly in `<head>` (see `app/layout.tsx`/`app/global-error.tsx`)
 * — the two root-defining `<html>` elements both need
 * `suppressHydrationWarning` alongside this, since the script's DOM
 * mutation happens before React ever gets a chance to compare against
 * what the server actually rendered.
 *
 * Mirrors `theme.context.tsx`'s `resolveTheme()`/`applyThemeClass()`
 * exactly, deliberately kept as a hand-written string (not importable
 * TypeScript — this has to run standalone, before any application
 * JavaScript, including this project's own bundled chunks). If either
 * function's logic changes, this needs the same change by hand.
 */
export function ThemeInitScript() {
    const script = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var t=(s==="light"||s==="dark")?s:(s==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):"dark");var c=document.documentElement.classList;c.remove("theme-dark","theme-light");c.add(t==="dark"?"theme-dark":"theme-light")}catch(e){}})()`;

    return (
        <script
            // eslint-disable-next-line react/no-danger -- the whole point: this must run as a plain, un-hydrated <script>, before hydration, see the doc comment above.
            dangerouslySetInnerHTML={{ __html: script }}
        />
    );
}
