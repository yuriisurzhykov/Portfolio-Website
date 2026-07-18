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
 * scripts, which is what lets it beat ThemeProvider's `useState(() => getInitialPreference())`
 * initializer.
 */
export async function seedTheme(page: Page, theme: ThemePreference): Promise<void> {
    await page.addInitScript(
        ([key, value]) => {
            window.localStorage.setItem(key, value);
        },
        [THEME_STORAGE_KEY, theme] as const,
    );
}
