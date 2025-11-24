import React from "react";
import { themeVars } from "@/shared/ui/theme";
import { Storybook } from "@/pages/storybook";

export function Root() {
    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: themeVars }} />
            <div className="min-h-screen bg-bg text-text">
                <Storybook />
            </div>
        </>
    );
}