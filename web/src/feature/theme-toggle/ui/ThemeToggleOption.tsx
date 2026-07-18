import type { JSX } from "react";
import * as React from "react";
import type { ThemeSwitcherOptionModel } from "../model/theme-toggle.model";
import { getThemeSwitcherStyles } from "./themeToggle.styles";
import { ln } from "@/shared/i18n/engine";

const styles = getThemeSwitcherStyles();

export interface ThemeSwitcherOptionProps {
    option: ThemeSwitcherOptionModel;
    isActive: boolean;
    onSelect: () => void;
    icon: React.ReactNode;
}

/**
 * Single segmented control option.
 */
export function ThemeToggleOption(props: ThemeSwitcherOptionProps): JSX.Element {
    const { option, isActive, onSelect, icon } = props;

    return (
        <button
            type="button"
            className={styles.option}
            aria-pressed={isActive}
            aria-label={ln(option.ariaLabel)}
            data-state={isActive ? "active" : "inactive"}
            onClick={onSelect}
        >
            <span className={styles.optionIcon}>{icon}</span>
            <span className={styles.optionLabel}>{ln(option.label)}</span>
        </button>
    );
}
