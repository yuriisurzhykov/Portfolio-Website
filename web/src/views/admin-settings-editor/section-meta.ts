import type { SiteContentKey } from "@portfolio/backend";

export interface SiteContentSectionMeta {
    key: SiteContentKey;
    label: string;
    description: string;
}

/**
 * The one place that needs to know about all 7 sections as a LIST (the
 * `/admin/settings` index page) — `SettingsEditorPage.tsx`'s dispatcher and
 * `content/site-content.ts`'s schemas each already enumerate them for
 * their own reason (rendering a specific form; validating a specific
 * shape), so this doesn't duplicate that, it's a third, presentation-only
 * concern (label + one-line description for the index page).
 */
export const SITE_CONTENT_SECTIONS: SiteContentSectionMeta[] = [
    { key: "hero", label: "Hero", description: "Landing page headline, subhead, chips, and node-graph illustration." },
    { key: "contact", label: "Contact CTA", description: "Landing page's closing call-to-action panel." },
    { key: "principles", label: "Principles", description: "\"How I work\" cards on the landing page." },
    { key: "techStack", label: "Tech stack", description: "Stack row on the landing page." },
    { key: "config", label: "Site config", description: "Identity, availability, and contact/social info shown across every page." },
    { key: "journalPage", label: "Journal page intro", description: "Heading and description at the top of /journal." },
    { key: "workPage", label: "Work page intro", description: "Heading and description at the top of /work." },
];
