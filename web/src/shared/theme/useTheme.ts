"use client";

import * as React from "react";
import { ThemeContext } from "./theme.context";
import type { ThemeContextValue } from "./theme.types";

/**
 * Hook to access the theme state inside the app.
 */
export function useTheme(): ThemeContextValue {
    const ctx = React.useContext(ThemeContext);

    if (!ctx) {
        throw new Error("useTheme must be used within <ThemeProvider />");
    }

    return ctx;
}
