import React from "react";
import { themeVars } from "@/shared/ui/theme";
import { Storybook } from "@/pages/storybook";

export function Root() {
    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: themeVars }} />
            <div className="theme-dark min-h-screen bg-(--color-bg) text-(--color-text)">
                <Storybook />
            </div>
        </>
    );
}