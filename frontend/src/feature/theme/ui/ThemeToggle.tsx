import React from "react";
import { useTheme } from "@/feature/theme";

export const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex gap-2 p-4 bg-surface border border-border rounded-md">
            <button
                onClick={() => setTheme("light")}
                className={`px-3 py-1 rounded-sm ${theme === 'light' ? 'bg-elevated text-accent-blue' : 'text-muted'}`}
            >
                Light
            </button>
            <button
                onClick={() => setTheme("dark")}
                className={`px-3 py-1 rounded-sm ${theme === 'dark' ? 'bg-elevated text-accent-blue' : 'text-muted'}`}
            >
                Dark
            </button>
            <button
                onClick={() => setTheme("system")}
                className={`px-3 py-1 rounded-sm ${theme === 'system' ? 'bg-elevated text-accent-blue' : 'text-muted'}`}
            >
                System
            </button>
        </div>
    );
};