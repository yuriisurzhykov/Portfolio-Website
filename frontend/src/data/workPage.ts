import type { Localized } from "@/shared/i18n";

/**
 * /work — PAGE INTRO COPY
 */
export const workPage: {
    heading: Localized<string[]>;
    description: Localized<string>;
} = {
    heading: {
        en: ["Systems I've shipped —", "and one still in flight."],
        ru: ["Системы, которые я довёл до релиза —", "и одна ещё в полёте."],
    },
    description: {
        en: "Every row below is a piece of infrastructure, not a screen. Status on the right tells you where it stands.",
        ru: "Каждая строка ниже — это инфраструктура, а не экран. Статус справа показывает, на каком этапе она сейчас.",
    },
};
