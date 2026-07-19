import * as React from "react";
import type { PostSummary, WorkSummary } from "@portfolio/backend";
import { Hero } from "./sections/Hero";
import { TechStack } from "./sections/TechStack";
import { Principles } from "./sections/Principles";
import { SelectedWork } from "./sections/SelectedWork";
import { JournalPreview } from "./sections/JournalPreview";
import { ContactCta } from "./sections/ContactCta";

export interface LandingPageProps {
    featuredWork: WorkSummary[];
    latestPost: PostSummary | null;
}

export function LandingPage({ featuredWork, latestPost }: LandingPageProps) {
    return (
        <main>
            <Hero />
            <TechStack />
            <Principles />
            <SelectedWork items={featuredWork} />
            <JournalPreview post={latestPost} />
            <ContactCta />
        </main>
    );
}
