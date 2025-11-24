import React from "react";

export type Theme = "light" | "dark" | "system";

export type ActualTheme = "light" | "dark";

export interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
}

export interface ThemeContextState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    actualTheme: ActualTheme; // Useful to know if system resolved to dark or light
}