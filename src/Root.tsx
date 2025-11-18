import React from "react";
import {themeVars} from "./design-system/design/theme.css.ts";
import {AppTest} from "./AppTest.tsx";

export function Root() {
    return (
        <>
            <style dangerouslySetInnerHTML={{__html: themeVars}} />
            <div className="theme-dark min-h-screen bg-(--color-bg) text-(--color-text)">
                <AppTest />
            </div>
        </>
    );
}