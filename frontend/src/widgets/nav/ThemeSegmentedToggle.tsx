import * as React from "react";
import { useTheme } from "@/shared/theme";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import type { ThemeId } from "@/shared/theme";

const OPTIONS: ThemeId[] = ["dark", "light"];

/**
 * ThemeSegmentedToggle
 * ---------------------
 * The "DARK / LIGHT" pill from the approved design's nav. Only exposes the
 * two explicit states shown in the mockup (no "system" option — that stays
 * a dev-only affordance on the Storybook's 3-way ThemeToggle). The active
 * option gets an inverted fill (bg-text-primary / text-bg-app), matching
 * the export's `background:var(--text);color:var(--bg)`.
 */
export function ThemeSegmentedToggle() {
    const { theme, setPreference } = useTheme();
    const { ln } = useTranslation();

    const labels: Record<ThemeId, string> = {
        dark: ln("label.button.theme.switch.dark"),
        light: ln("label.button.theme.switch.light"),
    };

    return (
        <div className="flex items-center gap-[2px] bg-surface-icon border border-border-subtle rounded-pill p-[3px]">
            {OPTIONS.map((option) => {
                const isActive = theme === option;
                return (
                    <button
                        key={option}
                        type="button"
                        onClick={() => setPreference(option)}
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
