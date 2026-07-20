"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";
import { useHideOnScroll } from "@/shared/lib/useHideOnScroll";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";

/**
 * Shows itself exactly when the sticky header (`widgets/nav/Nav.tsx`) has
 * hidden itself on scroll-down — same `useHideOnScroll()` hook, same
 * default threshold, called independently in each component rather than
 * shared via one lifted piece of state. That means two `scroll` listeners
 * doing the same computation instead of one; an acceptable trade for a
 * personal site at this scale against the alternative (prop-drilling this
 * state through AppLayout, or a small external store) — reconsider only if
 * this component gains more scroll-driven siblings.
 */
export function BackToTop() {
    const hidden = useHideOnScroll();
    const { ln } = useTranslation();

    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    return (
        <button
            type="button"
            onClick={scrollToTop}
            aria-label={ln("label.aria.backToTop")}
            // aria-hidden/tabIndex, not just opacity: while the header is
            // visible (i.e. this button is faded out), it shouldn't be
            // reachable by Tab either — same reasoning as Drawer's `inert`
            // for its closed state, see shared/ui/drawer/README.md.
            aria-hidden={!hidden}
            tabIndex={hidden ? 0 : -1}
            className={cn(
                "fixed bottom-lg right-lg z-snackbar",
                "w-11 h-11 rounded-full",
                "flex items-center justify-center",
                "bg-surface-base border border-border-subtle shadow-surface-deep",
                "text-text-primary hover:bg-surface-raised hover:border-border-highlight",
                "transition-[opacity,transform] duration-normal ease-standard",
                hidden ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
            )}
        >
            <ArrowUp className="w-5 h-5" aria-hidden="true" />
        </button>
    );
}
