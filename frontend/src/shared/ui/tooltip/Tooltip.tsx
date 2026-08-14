import { cn } from "@/shared/lib/utils";
import type { TooltipProps } from "./Tooltip.types";

/**
 * tooltip
 * -------
 * A CSS-only hover/focus hint bubble — no JS state, no positioning
 * library: `group/tooltip` + `group-hover/tooltip:`/`group-focus-within/tooltip:`
 * variants show/hide it, and its position is a fixed `bottom-full` offset
 * from the trigger, not measured/flipped at runtime. Good enough for a
 * short row of same-size icons (this component's first and, so far, only
 * use case — the landing page's tech-logo row); reconsider if a future
 * caller needs edge-aware repositioning.
 *
 * Deliberately NOT a full WAI-ARIA tooltip pattern (`role="tooltip"` +
 * `aria-describedby` linking a unique id back to the trigger). The bubble
 * is `aria-hidden` — purely decorative — and the caller is expected to
 * give its trigger (`children`) its OWN accessible name (`aria-label` or
 * visible text) equal to `label`. That's a deliberate simplification, not
 * an oversight: every current caller shows the exact same short string
 * both places (a tech's display name), so a screen reader user already
 * gets the full information from the trigger's own accessible name alone
 * — wiring a second, redundant `aria-describedby` relationship would add
 * real markup/id-management complexity for zero new information. If a
 * future caller ever needs the bubble to carry information the trigger's
 * accessible name doesn't already have, that's the point to build the
 * real ARIA pattern instead of stretching this one.
 */
export function Tooltip({ label, children, className }: TooltipProps) {
    return (
        <span className={cn("group/tooltip relative inline-flex", className)}>
            {children}
            <span
                aria-hidden
                className={cn(
                    "pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2",
                    // `bg-surface-base`, not `-raised` — see
                    // `RelatedItemPicker`'s identical fix/comment: `-raised`
                    // is a near-transparent tint meant to sit atop an
                    // already-opaque parent, not to be a floating bubble's
                    // only backdrop over whatever's on the page underneath.
                    "whitespace-nowrap rounded-sm border border-border-default bg-surface-base",
                    "px-sm py-xs font-mono text-micro text-text-primary shadow-lg",
                    "opacity-0 scale-95 transition-[opacity,transform] duration-fast ease-standard",
                    "group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100",
                    "group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:scale-100",
                    "motion-reduce:transition-none",
                )}
            >
                {label}
            </span>
        </span>
    );
}
