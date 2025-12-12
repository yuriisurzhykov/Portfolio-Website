import type { ReactNode } from "react";
import * as React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Icon to the left of text */
    iconLeft?: ReactNode;
    /** Icon to the right from text */
    iconRight?: ReactNode;
    /** Stretches the button to the full available width */
    fullWidth?: boolean;
    /** Whether system loader should be enabled for the button on hover */
    loading?: boolean;
};