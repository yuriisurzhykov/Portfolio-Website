type VariantKey = "default";

interface ThemeToggleStyles {
    root: string;
    header: string;
    title: string;
    subtitle: string;
    track: string;
    option: string;
    optionIcon: string;
    optionLabel: string;
    optionDescription: string;
}

/**
 * Tailwind v4 classes exclusively on design tokens:
 * - colors: bg-surface-raised, text-text-secondary, etc.
 * - spacing: gap-sm, px-md, py-xs, etc.
 * - radius: rounded-pill.
 * - motion: duration-fast, ease-standard.
 * - shadows: shadow-soft-glow, shadow-focus-ring.
 */
const THEME_SWITCHER_STYLES: Record<VariantKey, ThemeToggleStyles> = {
    default: {
        root:
            [
                "inline-flex",
                "flex-col",
                "gap-xs",
                "text-text-secondary",
            ].join(" "),
        header:
            [
                "flex",
                "items-baseline",
                "justify-between",
                "gap-xs",
            ].join(" "),
        title:
            [
                "text-caption",
                "font-medium",
                "text-text-muted",
                "tracking-wide",
                "uppercase",
            ].join(" "),
        subtitle:
            [
                "text-micro",
                "text-text-muted",
            ].join(" "),
        track:
            [
                "relative",
                "flex",
                "items-center",
                "gap-xxs",
                "bg-surface-base",
                "rounded-pill",
                "border",
                "border-border-subtle",
                "shadow-surface-deep",
                "px-xxs",
                "py-xxs",
                "overflow-hidden",
            ].join(" "),
        option:
            [
                "group",
                "relative",
                "flex-1",
                "inline-flex",
                "items-center",
                "justify-center",
                "gap-xxs",
                "rounded-pill",
                "px-sm",
                "py-xs",
                "text-caption",
                "font-medium",
                "text-text-secondary",
                "transition-[background,box-shadow,color,transform]",
                "duration-fast",
                "ease-standard",
                "cursor-pointer",
                "outline-none",

                // Hover/active
                "hover:text-text-primary",
                "hover:shadow-soft-glow",
                "active:scale-[var(--scale-press)]",

                // Focus ring
                "focus-visible:shadow-focus-ring",

                // Active state via data attribute
                "data-[state=active]:bg-surface-raised",
                "data-[state=active]:shadow-soft-glow",
            ].join(" "),
        optionIcon:
            [
                "w-sm",
                "h-sm",
                "shrink-0",
                "stroke-current",
                "fill-none",
            ].join(" "),
        optionLabel:
            [
                "text-caption",
                "font-medium",
            ].join(" "),
        optionDescription:
            [
                "hidden",
                "text-micro",
                "text-text-muted",
                "group-data-[state=active]:inline",
            ].join(" "),
    },
};

export function getThemeSwitcherStyles(variant: VariantKey = "default"): ThemeToggleStyles {
    return THEME_SWITCHER_STYLES[variant];
}