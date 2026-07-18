import type { JSX } from "react";
import * as React from "react";
import type { ThemeContextValue, ThemeId, ThemePreference } from "./theme.types";

const STORAGE_KEY = "portfolio.theme-preference";

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getInitialPreference(): ThemePreference {
    if (typeof window === "undefined") {
        return "dark";
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored === "dark" || stored === "light" || stored === "system") {
        return stored;
    }

    // The public site ships dark-only; "system" is only reachable via the
    // dev-only ThemeToggle in Storybook.
    return "dark";
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
    const {children} = props;

    const [preference, setPreferenceState] = React.useState<ThemePreference>(() => getInitialPreference());
    const [theme, setTheme] = React.useState<ThemeId>(() => resolveTheme(getInitialPreference()));

    // Sync theme with preference and system changes
    React.useEffect(() => {
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

    return <ThemeContext.Provider value={ value }>{ children }</ThemeContext.Provider>;
}

export { ThemeContext };
