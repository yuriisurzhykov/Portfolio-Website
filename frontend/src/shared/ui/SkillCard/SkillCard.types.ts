import type * as React from "react";

/**
 * Visual style presets for the SkillCard surface.
 *
 * Variants only combine existing design tokens from tokens.ts & index.css,
 * without introducing adhoc colors or radii.
 */
export type SkillCardVariant = "default" | "outlined" | "subtle" | "accent";

/**
 * Tone affects icon and subtle accent color but does not change the layout.
 * All tones map to semantic tokens (status / accent).
 */
export type SkillCardTone = "default" | "accent" | "success" | "warning" | "error";

/**
 * Props for the SkillCard root component.
 *
 * - `icon` – React component for the icon (e.g., a lucide icon) must accept `className`.
 * - `title` – Short, descriptive title.
 * - `desc` – One-paragraph description.
 */
export interface SkillCardProps extends React.HTMLAttributes<HTMLDivElement> {
    icon?: React.ComponentType<{ className?: string }>;
    title: string;
    desc: string;
    variant?: SkillCardVariant;
    tone?: SkillCardTone;
}
