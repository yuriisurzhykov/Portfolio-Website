"use client";

import * as React from "react";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import type { Language } from "@/shared/i18n";

const OPTIONS: Language[] = ["en", "ru"];

/**
 * LanguageSegmentedToggle
 * ------------------------
 * EN / RU pill in the public nav, styled to match ThemeSegmentedToggle.
 * Switches the active `Language` on the shared i18n context, which drives
 * both `ln()` UI-chrome strings and `pick()` content resolution.
 */
export function LanguageSegmentedToggle() {
    const { language, setLanguage, ln } = useTranslation();

    const labels: Record<Language, string> = {
        en: ln("label.button.language.en"),
        ru: ln("label.button.language.ru"),
    };

    return (
        <div className="flex items-center gap-[2px] bg-surface-icon border border-border-subtle rounded-pill p-[3px]">
            {OPTIONS.map((option) => {
                const isActive = language === option;
                return (
                    <button
                        key={option}
                        type="button"
                        onClick={() => setLanguage(option)}
                        aria-pressed={isActive}
                        className={cn(
                            "rounded-pill px-[10px] py-[5px]",
                            "font-mono font-semibold text-[10.5px] uppercase",
                            "transition-colors duration-fast",
                            isActive ? "bg-text-primary text-bg-app" : "text-text-muted hover:text-text-primary",
                        )}
                    >
                        {labels[option]}
                    </button>
                );
            })}
        </div>
    );
}
