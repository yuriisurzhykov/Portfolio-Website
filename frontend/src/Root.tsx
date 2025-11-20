import React from "react";
import { Storybook } from "./Storybook.tsx";
import { themeVars } from "@/shared/ui/theme";

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