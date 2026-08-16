import type { Page } from "@playwright/test";

/**
 * Mirrors ThemePreference from src/shared/theme/theme.types.ts, minus "system" — the test suite
 * only ever needs to force one of the two concrete themes, never "follow the OS".
 */
export type ThemePreference = "light" | "dark";

export const THEMES: readonly ThemePreference[] = ["light", "dark"];

/** Must match STORAGE_KEY in src/shared/theme/theme.context.tsx exactly. */
const THEME_STORAGE_KEY = "portfolio.theme-preference";

/**
 * Forces the app into a given theme before it ever renders, by seeding the same localStorage key
 * ThemeProvider reads on first mount. This works even though the light theme is normally only
 * reachable through the dev-only Storybook toggle on the public site — no UI interaction needed.
 *
 * Must be called BEFORE `page.goto(...)`: `addInitScript` runs before any of the page's own
 * scripts, including `app/theme-init-script.tsx`'s inline, pre-hydration `<script>` — which is
 * what actually applies the seeded theme, synchronously, before the browser's first paint.
 *
 * A PREVIOUS version of this comment claimed the seeded value was "picked up one effect-tick
 * later... early enough for `waitForLoadState("networkidle")` ... to settle on the seeded theme
 * before a screenshot/axe scan runs." That was wrong, and was the actual root cause of a
 * recurring, timing-dependent Playwright flake (see `shared/theme/README.md`'s dated entry):
 * `networkidle` tracks network activity only — it has no way to know about, and never waits for,
 * a React effect. ThemeProvider's correction effects are a real, necessary fallback (see their
 * own comments), but they run after hydration AND after the first paint, which is exactly the
 * window Playwright's screenshot-stability check can land in. The actual fix was moving the
 * correction earlier than any React code can run at all, not making this test wait longer.
 */
export async function seedTheme(page: Page, theme: ThemePreference): Promise<void> {
    await page.addInitScript(
        ([key, value]) => {
            window.localStorage.setItem(key, value);
        },
        [THEME_STORAGE_KEY, theme] as const,
    );
}
