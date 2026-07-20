import * as React from "react";
import type { ConfigContent, ContactContent, HeroContent, PostSummary, PrinciplesContent, TechStackContent, WorkSummary } from "@portfolio/backend";
import { Hero } from "./sections/Hero";
import { TechStack } from "./sections/TechStack";
import { Principles } from "./sections/Principles";
import { SelectedWork } from "./sections/SelectedWork";
import { JournalPreview } from "./sections/JournalPreview";
import { ContactCta } from "./sections/ContactCta";

export interface LandingPageProps {
    featuredWork: WorkSummary[];
    latestPost: PostSummary | null;
    hero: HeroContent;
    contact: ContactContent;
    principles: PrinciplesContent;
    techStack: TechStackContent;
    config: ConfigContent;
}

export function LandingPage({ featuredWork, latestPost, hero, contact, principles, techStack, config }: LandingPageProps) {
    return (
        <main>
            <Hero hero={hero} role={config.role} />
            <TechStack techStack={techStack} />
            <Principles principles={principles} />
            <SelectedWork items={featuredWork} />
            <JournalPreview post={latestPost} />
            <ContactCta contact={contact} email={config.email} />
        </main>
    );
}
