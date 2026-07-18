import type { Localized } from "@/shared/i18n";

/**
 * SITE CONFIG
 * -----------
 * Identity, availability, and contact/social info shared across every page
 * (nav badge, hero, contact CTA, footer). Edit this file to rebrand or to
 * update availability — no component changes needed.
 */
export const site = {
    name: "Yurii Surzhykov",
    /** Shown in the nav brand mark, top-left of every page. */
    initials: "YS",
    role: { en: "Systems Engineer", ru: "Системный инженер" } as Localized,
    email: "yuriisurzhykov@gmail.com",
    /** Drives the nav availability pill — one of "available" | "engaged" | "limited". */
    availability: "available" as "available" | "engaged" | "limited",
    social: {
        github: "https://github.com/yuriisurzhykov",
        linkedin: "https://linkedin.com/in/yuriisurzhykov",
    },
} as const;
