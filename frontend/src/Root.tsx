import React from "react";
import { BrowserRouter } from "react-router-dom";
import { themeVars } from "@/shared/ui/theme";
import { AppRoutes } from "@/app/router/routes";

export function Root() {
    return (
        <>
            <style dangerouslySetInnerHTML={ {__html: themeVars} }/>
            <BrowserRouter>
                <AppRoutes/>
            </BrowserRouter>
        </>
    );
}
