import type { Localized } from "@/shared/i18n";

/**
 * /journal — PAGE INTRO COPY
 */
export const journalPage: {
    heading: Localized<string>;
    description: Localized<string>;
} = {
    heading: {
        en: "A commit log for how I think.",
        ru: "Коммит-лог того, как я думаю.",
    },
    description: {
        en: "Notes on architecture, decisions, and the trade-offs behind the systems I build - written like commits, not blog posts.",
        ru: "Заметки об архитектуре, решениях и компромиссах за системами, которые я строю — написанные как коммиты, а не посты в блоге.",
    },
};
