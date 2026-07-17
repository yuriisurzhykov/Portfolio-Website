export type ThemeId = "dark" | "light";

/**
 * What the user selected explicitly.
 * "system" = follow OS preference, but anyway we resolve in into dark/light.
 */
export type ThemePreference = ThemeId | "system";

export interface ThemeContextValue {
    /** Resolved theme after applying "system" preference. */
    theme: ThemeId;
    /** Raw user preference (light | dark | system). */
    preference: ThemePreference;
    /** Update user preference + persist + apply className. */
    setPreference: (value: ThemePreference) => void;
}
