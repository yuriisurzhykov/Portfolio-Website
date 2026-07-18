import type { Localized } from "@/shared/i18n";

/**
 * LANDING PAGE — "HOW I WORK" CARDS
 * -----------------------------------
 * Order = display order.
 */
export interface Principle {
    title: Localized<string>;
    description: Localized<string>;
}

export const principles: Principle[] = [
    {
        title: {en: "Order over chaos", ru: "Порядок вместо хаоса"},
        description: {
            en: "I design the structure so nobody downstream has to think about it.",
            ru: "Я закладываю структуру так, чтобы никому ниже по цепочке не пришлось об этом думать.",
        },
    },
    {
        title: {en: "Simplify ruthlessly", ru: "Простота без компромиссов"},
        description: {
            en: "Every abstraction earns its complexity, or it gets cut.",
            ru: "Каждая абстракция обязана окупать свою сложность — или её вырезают.",
        },
    },
    {
        title: {en: "Own the whole pipe", ru: "Отвечаю за весь путь"},
        description: {
            en: "From the camera driver to the UI thread — I trace the entire path, not just my layer.",
            ru: "От драйвера камеры до UI-потока — я прохожу весь путь, а не только свой слой.",
        },
    },
    {
        title: {en: "Ship, then harden", ru: "Сначала запуск, потом закалка"},
        description: {
            en: "Working software first. Resilience isn't optional — it just comes right after.",
            ru: "Сначала — работающий продукт. Надёжность не опциональна, она просто идёт следом.",
        },
    },
];
