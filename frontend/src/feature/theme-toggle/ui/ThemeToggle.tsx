import type { JSX } from "react";
import * as React from "react";
import { useTheme } from "@/shared/theme";
import type { ThemeSwitcherOptionId } from "../model/theme-toggle.model.ts";
import { THEME_SWITCHER_OPTIONS } from "../model/theme-toggle.model.ts";
import { getThemeSwitcherStyles } from "./themeToggle.styles.ts";
import { MoonIcon, SunIcon, SystemIcon } from "./themeToggle.icons.tsx";
import { ThemeToggleOption } from "./ThemeToggleOption.tsx";
import { ln } from "@/shared/i18n/engine";

const styles = getThemeSwitcherStyles();

const ICON_BY_ID: Record<ThemeSwitcherOptionId, JSX.Element> = {
    light: <SunIcon/>,
    system: <SystemIcon/>,
    dark: <MoonIcon/>,
};

/**
 * JetBrains-style segmented theme switcher.
 * 3 options: Light / Auto / Dark.
 */
export function ThemeToggle(): JSX.Element {
    const {preference, setPreference} = useTheme();

    return (
        <section className={ styles.root } aria-label={ ln("label.aria.theme.toggle.section.description") }>
            <header className={ styles.header }>
                <span className={ styles.title }>{ ln("label.theme.toggle.caption") }</span>
            </header>

            <div className={ styles.track }>
                { THEME_SWITCHER_OPTIONS.map((option) => (
                    <ThemeToggleOption
                        key={ option.id }
                        option={ option }
                        isActive={ preference === option.id }
                        onSelect={ () => setPreference(option.id) }
                        icon={ ICON_BY_ID[option.id] }
                    />
                )) }
            </div>
        </section>
    );
}
