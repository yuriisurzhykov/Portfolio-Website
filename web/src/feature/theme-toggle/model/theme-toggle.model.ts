import type { ThemePreference } from "@/shared/theme";

export type ThemeSwitcherOptionId = ThemePreference;

export interface ThemeSwitcherOptionModel {
    id: ThemeSwitcherOptionId;
    label: string;
    description: string;
    ariaLabel: string;
}

export const THEME_SWITCHER_OPTIONS: ThemeSwitcherOptionModel[] = [
    {
        id: "light",
        label: "label.button.theme.switch.light",
        description: "label.description.theme.switch.light",
        ariaLabel: "label.aria.theme.switch.light",
    },
    {
        id: "system",
        label: "label.button.theme.switch.auto",
        description: "label.description.theme.switch.auto",
        ariaLabel: "label.aria.theme.switch.auto",
    },
    {
        id: "dark",
        label: "label.button.theme.switch.dark",
        description: "label.description.theme.switch.dark",
        ariaLabel: "label.aria.theme.switch.dark",
    },
];
