"use client";

import type { JSX } from "react";
import * as React from "react";
import { THEME_STORAGE_KEY as STORAGE_KEY } from "./constants";
import type { ThemeContextValue, ThemeId, ThemePreference } from "./theme.types";

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

/**
 * Always "dark" — deliberately NOT reading `localStorage` here anymore,
 * even though the client (unlike the server) genuinely could. This used
 * to branch on `typeof window === "undefined"` (server → "dark", client →
 * read storage), which is exactly the pattern React's own hydration-error
 * message calls out by name: on the very first render, the SERVER always
 * produces "dark," while the CLIENT's first render (before any effect has
 * run) would already read a stored "light"/"system" preference — two
 * different outputs for what's supposed to be the same initial render,
 * which is what a hydration mismatch actually is. Found via a live report
 * (a real browser with a previously-stored non-dark preference), not by
 * any type check or test — this port from the pre-SSR Vite app carried the
 * bug in dormant form the whole time; it simply couldn't manifest without
 * a server-rendered HTML to mismatch against.
 *
 * The fix: the first render is always "dark" on both server AND client —
 * genuinely identical output, no mismatch — and the effect below corrects
 * it to the stored preference immediately after mount, client-only. Same
 * general shape as the `system` case (`resolveTheme`) — no branch reaches
 * for `window`/`localStorage` during the render itself, only inside
 * effects, which never run during SSR and never run during hydration's
 * first pass either.
 */
function getInitialPreference(): ThemePreference {
    return "dark";
}

function readStoredPreference(): ThemePreference | null {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light" || stored === "system") {
        return stored;
    }
    return null;
}

function resolveTheme(preference: ThemePreference): ThemeId {
    if (preference === "system") {
        if (typeof window === "undefined") {
            return "dark";
        }

        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        return prefersDark ? "dark" : "light";
    }

    return preference;
}

function applyThemeClass(theme: ThemeId): void {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    root.classList.remove("theme-dark", "theme-light");
    root.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
}

/**
 * Root provider for light/dark theme based on design tokens.
 * Applies .theme-dark / .theme-light на <html>.
 */
export function ThemeProvider(props: { children: React.ReactNode }): JSX.Element {
    const { children } = props;

    const [preference, setPreferenceState] = React.useState<ThemePreference>(() => getInitialPreference());
    const [theme, setTheme] = React.useState<ThemeId>(() => resolveTheme(getInitialPreference()));

    // Corrects the deterministic "dark" first render to whatever was
    // actually stored, the moment it's safe to do so (client-only, after
    // mount) — see getInitialPreference()'s comment for why this can't
    // just happen during the initial render anymore. Runs once; the
    // effect below reacts to the resulting `preference` change the same
    // way it reacts to a manual setPreference() call.
    //
    // `useLayoutEffect`, not `useEffect`, on BOTH this and the theme-sync
    // effect below — together they're the fallback path, not the primary
    // fix. The actual fix for "flash of wrong theme" is
    // `app/theme-init-script.tsx`'s inline <script>, which runs during
    // HTML parsing, before hydration even starts, and already applies the
    // correct `.theme-*` class before first paint — `waitForLoadState
    // ("networkidle")` never waits for a React effect, which is exactly
    // what made this a recurring, timing-dependent Playwright flake (see
    // `shared/theme/README.md`'s dated entry). These two effects staying
    // `useLayoutEffect` (not `useEffect`) closes a SEPARATE, real gap the
    // inline script can't: React's Strict Mode intentionally remounts once
    // in development and resets `<html>`/`<head>`/`<body>` to only the
    // attributes/classes THEY manage from JSX — wiping the class the
    // inline script set. `useLayoutEffect` re-applies it before the
    // browser paints the remounted tree; a plain `useEffect` would let
    // that flash back in, dev-mode only (Strict Mode's double-render
    // never happens in production, so this doesn't affect the CI flake
    // itself — only local `npm run dev`).
    React.useLayoutEffect(() => {
        const stored = readStoredPreference();
        if (stored && stored !== preference) {
            setPreferenceState(stored);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally once-on-mount only
    }, []);

    // Sync theme with preference and system changes. `useLayoutEffect`,
    // not `useEffect` — see the comment above; this is the effect that
    // actually calls `applyThemeClass`, so IT has to be the one that runs
    // before paint for the Strict-Mode-remount case to be fully closed,
    // not just the one that corrects `preference` above it.
    React.useLayoutEffect(() => {
        const resolved = resolveTheme(preference);
        setTheme(resolved);
        applyThemeClass(resolved);

        if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, preference);
        }
    }, [preference]);

    // Listen to system theme changes when in "system" mode
    React.useEffect(() => {
        if (typeof window === "undefined" || preference !== "system") return;

        const media = window.matchMedia("(prefers-color-scheme: dark)");

        const handleChange = () => {
            const nextTheme: ThemeId = media.matches ? "dark" : "light";
            setTheme(nextTheme);
            applyThemeClass(nextTheme);
        };

        // Initial sync
        handleChange();

        media.addEventListener("change", handleChange);
        return () => media.removeEventListener("change", handleChange);
    }, [preference]);

    const setPreference = React.useCallback((value: ThemePreference) => {
        setPreferenceState(value);
    }, []);

    const value: ThemeContextValue = React.useMemo(
        () => ({
            theme,
            preference,
            setPreference,
        }),
        [theme, preference, setPreference],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export { ThemeContext };
