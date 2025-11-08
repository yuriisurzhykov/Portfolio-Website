import * as React from "react";
import {ThemeProvider} from "../providers/ThemeProvider";
import {themeVars} from "../design-system/theme.css.ts";

export function RootLayout({children}: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <style dangerouslySetInnerHTML={{__html: themeVars}}/>
            <div className="min-h-screen bg-[--color-bg] text-[--color-text]">
                {children}
            </div>
        </ThemeProvider>
    );
}