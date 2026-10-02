import { Menu } from "@mantine/core";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

import { useTranslation } from "@/shared/i18n";
import { useTheme } from "@/shared/theme";
import type { ThemePreference } from "@/shared/theme";

import styles from "./ThemeDropdown.module.css";

export type ThemeDropdownProps = {
    options?: readonly ThemePreference[];
    className?: string;
};

const DEFAULT_OPTIONS: readonly ThemePreference[] = [
    "dark",
    "light",
    "system",
];

const ICONS: Record<ThemePreference, LucideIcon> = {
    dark: Moon,
    light: Sun,
    system: Monitor,
};

const LABEL_KEYS: Record<ThemePreference, string> = {
    dark: "label.button.theme.switch.dark",
    light: "label.button.theme.switch.light",
    system: "label.button.theme.switch.auto",
};

export const ThemeDropdown = ({
                                  options = DEFAULT_OPTIONS,
                                  className,
                              }: ThemeDropdownProps) => {
    const { preference, setPreference } = useTheme();
    const { ln } = useTranslation();
    const CurrentIcon = ICONS[preference];
    const triggerLabel = ln(LABEL_KEYS[preference]);

    return (
        <Menu
            position="bottom-end"
            width="max-content"
            middlewares={{ flip: true, shift: true }}
            classNames={{
                item: styles.item,
                itemLabel: styles.itemLabel,
                itemSection: styles.itemSection,
            }}
        >
            <Menu.Target>
                <button
                    type="button"
                    className={[
                        styles.trigger,
                        className,
                    ].filter(Boolean).join(" ")}
                    aria-label={`${ln("label.theme.toggle.caption")}: ${triggerLabel}`}
                    title={triggerLabel}
                >
                    <CurrentIcon
                        className={styles.triggerIcon}
                        aria-hidden="true"
                    />
                </button>
            </Menu.Target>

            <Menu.Dropdown className={styles.dropdown}>
                {options.map((option) => {
                    const OptionIcon = ICONS[option];
                    const selected = option === preference;

                    return (
                        <Menu.Item
                            key={option}
                            leftSection={
                                <OptionIcon
                                    className={styles.itemIcon}
                                    aria-hidden="true"
                                />
                            }
                            rightSection={
                                selected ? (
                                    <span
                                        className={styles.selectionMark}
                                        aria-hidden="true"
                                    >
                                        ✓
                                    </span>
                                ) : null
                            }
                            role="menuitemradio"
                            aria-checked={selected}
                            onClick={() => setPreference(option)}
                        >
                            {ln(LABEL_KEYS[option])}
                        </Menu.Item>
                    );
                })}
            </Menu.Dropdown>
        </Menu>
    );
};