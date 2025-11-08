import * as React from "react";

export function ThemeProvider({children}: { children: React.ReactNode }) {
    // In the future: save theme to the localStorage, and listens prefers-color-scheme
    return <div className="theme-dark">{children}</div>;
}