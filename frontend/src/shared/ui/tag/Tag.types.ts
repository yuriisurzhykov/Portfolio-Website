import type { HTMLAttributes } from "react";

export type TagVariant = "neutral" | "outline" | "accent";
export type TagSize = "sm" | "md";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: TagVariant;
    size?: TagSize;
}