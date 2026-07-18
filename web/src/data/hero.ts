import type { Localized } from "@/shared/i18n";

/**
 * LANDING PAGE — HERO
 * --------------------
 * headline is rendered as two stacked lines (first/last name); everything
 * else maps straight onto the section as written. Prose fields are
 * `Localized<T>` — resolve with `pick()` from `useTranslation()`.
 */

export interface HeroGraphNode {
    label: string;
    sublabel: Localized<string>;
    highlighted?: boolean;
}

export const hero: {
    headline: string[];
    subhead: Localized<string>;
    chips: Localized<string[]>;
    graphNodes: HeroGraphNode[];
} = {
    headline: ["Yurii", "Surzhykov"],
    subhead: {
        en: "I design the systems other engineers build on top of — event-driven architecture, a custom navigation engine, code-generation tooling, and the camera pipeline underneath an OEM Android platform.",
        ru: "Я проектирую системы, на которые опираются остальные инженеры команды — event-driven архитектуру, кастомный движок навигации, инструменты кодогенерации и камера-пайплайн внутри Android-платформы для OEM-устройств.",
    },
    chips: {
        en: [
            "flowbus · shipped",
            "navigation-engine · shipped",
            "asyncapi-compiler · shipped",
            "onvif-camera-lib · in progress",
        ],
        ru: [
            "flowbus · готово",
            "navigation-engine · готово",
            "asyncapi-compiler · готово",
            "onvif-camera-lib · в работе",
        ],
    },
    /** Floating node-graph illustration next to the headline. */
    graphNodes: [
        {
            label: "Client",
            sublabel: { en: "Android · OEM · AOSP", ru: "Android · OEM · AOSP" },
        },
        {
            label: "Navigation Engine",
            sublabel: { en: "route · rendering", ru: "маршрут · рендеринг" },
            highlighted: true,
        },
        {
            label: "FlowBus",
            sublabel: { en: "event bus · pub/sub · Kotlin", ru: "шина событий · pub/sub · Kotlin" },
        },
    ],
};
