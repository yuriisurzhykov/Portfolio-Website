import * as React from "react";
import { Hero } from "./sections/Hero";
import { TechStack } from "./sections/TechStack";
import { Principles } from "./sections/Principles";
import { SelectedWork } from "./sections/SelectedWork";
import { JournalPreview } from "./sections/JournalPreview";
import { ContactCta } from "./sections/ContactCta";

export function LandingPage() {
    return (
        <main>
            <Hero />
            <TechStack />
            <Principles />
            <SelectedWork />
            <JournalPreview />
            <ContactCta />
        </main>
    );
}
