import React, { createContext, useEffect, useLayoutEffect, useState } from "react";
import { themeVars } from "@/shared/ui/theme";
import type { ActualTheme, Theme, ThemeContextState, ThemeProviderProps } from "@/feature/theme/model/types.ts";

export const ThemeContext = createContext<ThemeContextState | undefined>(undefined);

export function ThemeProvider(
    {
        children,
        defaultTheme = "system",
        storageKey = "vite-ui-theme",
    }: ThemeProviderProps
) {
    // 1. Initialize state from storage or default
    const [theme, setThemeState] = useState<Theme>(() => {
        return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
    });

    const [actualTheme, setActualTheme] = useState<ActualTheme>("dark");

    // 2. Inject the CSS Variables (The Magic Step)
    useLayoutEffect(() => {
        const styleId = "dynamic-theme-vars";
        let styleTag = document.getElementById(styleId);

        if (!styleTag) {
            styleTag = document.createElement("style");
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }

        styleTag.innerHTML = themeVars;
    }, []);

    // 3. Handle Theme Switching
    useEffect(() => {
        const root = window.document.documentElement;

        // Remove old classes
        root.classList.remove("theme-light", "theme-dark");

        let computedTheme = theme;

        if (theme === "system") {
            computedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
        }

        // Apply the class to <html>
        root.classList.add(computedTheme === "dark" ? "theme-dark" : "theme-light");

        // Update state for consumers
        setActualTheme(computedTheme as "light" | "dark");

    }, [theme]);

    const value: ThemeContextState = {
        theme,
        setTheme: (newTheme: Theme) => {
            localStorage.setItem(storageKey, newTheme);
            setThemeState(newTheme);
        },
        actualTheme,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}