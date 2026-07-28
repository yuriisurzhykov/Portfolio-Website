import * as React from "react";
import { type HTMLAttributes } from "react";

export type IconBadgeTone = "default" | "accent" | "success" | "warning" | "error";
export type IconBadgeSize = "sm" | "md" | "lg";

export interface IconBadgeProps extends HTMLAttributes<HTMLDivElement> {
    icon: React.ComponentType<{ className?: string }>;
    tone?: IconBadgeTone;
    size?: IconBadgeSize;
}