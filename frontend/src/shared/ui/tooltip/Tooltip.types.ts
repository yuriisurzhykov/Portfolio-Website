import type { ReactNode } from "react";

export interface TooltipProps {
    /** Shown in the decorative hover/focus bubble. Also expected to be the trigger's own accessible name (`aria-label`/visible text) — see Tooltip.tsx's top comment for why this component doesn't wire a real `aria-describedby` relationship. */
    label: string;
    children: ReactNode;
    className?: string;
}
