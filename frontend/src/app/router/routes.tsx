import * as React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/widgets/layout";
import { LandingPage } from "@/pages/landing";
import { WorkListPage } from "@/pages/work-list";
import { WorkDetailPage } from "@/pages/work-detail";
import { JournalListPage } from "@/pages/journal-list";
import { JournalDetailPage } from "@/pages/journal-detail";
import { Storybook } from "@/pages/storybook";

/**
 * Route map for the public site + the dev-only /storybook design-system
 * showcase (no Nav/Footer chrome, not linked from anywhere in the UI).
 */
export function AppRoutes() {
    return (
        <Routes>
            <Route element={ <AppLayout/> }>
                <Route path="/" element={ <LandingPage/> }/>
                <Route path="/work" element={ <WorkListPage/> }/>
                <Route path="/work/:slug" element={ <WorkDetailPage/> }/>
                <Route path="/journal" element={ <JournalListPage/> }/>
                <Route path="/journal/:slug" element={ <JournalDetailPage/> }/>
            </Route>
            <Route path="/storybook" element={ <Storybook/> }/>
            <Route path="*" element={ <Navigate to="/" replace/> }/>
        </Routes>
    );
}
