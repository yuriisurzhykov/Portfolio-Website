"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/lib/utils";

export interface DrawerProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    /** Which edge of the screen the panel slides in from. */
    side?: "left" | "right";
    /** Required — this is a modal dialog, it needs an accessible name. */
    "aria-label": string;
}

/**
 * Generic slide-in panel with a backdrop — not specific to the main site
 * nav. Will this be reused? Yes: any future mobile-friendly overlay
 * (an admin sidebar in Phase 4, a filters panel, ...) needs the exact same
 * mechanics (backdrop, Escape-to-close, scroll lock, focus not leaking
 * into hidden content) — those are the genuinely reusable, easy-to-get-
 * subtly-wrong parts. `widgets/nav/MobileNavPanel.tsx` supplies the
 * nav-specific CONTENT; this component only knows how to open, close, and
 * behave like a proper dialog.
 *
 * 2026-07-19 — Portals to `document.body` instead of rendering inline.
 * Without this, when `Nav` renders `<Drawer/>` inside its `<header>`
 * (which has `backdrop-blur-md`), the panel and backdrop's `position:
 * fixed` stopped being "fixed to the viewport" at all — per the CSS spec,
 * `backdrop-filter` (also `filter`, `transform`, `perspective`,
 * `will-change` on those properties) on an ANCESTOR creates a new
 * containing block for its `position: fixed` descendants, making them
 * fixed relative to THAT ancestor instead. The header is only as tall as
 * its own row, so the "full-screen" backdrop and panel collapsed down to
 * the header's own box — a live screenshot showed the panel squashed into
 * a strip at the top with the rest of the page bleeding through beneath
 * it. Moving the drawer's own `<header>` to include `backdrop-blur-md`
 * would "fix" this one call site, but the same landmine would still be
 * waiting for the next place `<Drawer/>` gets used inside ANY element with
 * a filter/transform — which is exactly the kind of ancestor styling a
 * shared, reusable component can't and shouldn't assume its caller avoids.
 * Portaling directly to `document.body` makes the drawer immune to any
 * ancestor's CSS, permanently, not just for this one bug.
 */
export function Drawer({ open, onClose, children, side = "right", ...rest }: DrawerProps) {
    // `document`/`document.body` don't exist during SSR, and calling
    // `createPortal` before mount would target a DOM node that isn't
    // there yet — deferred to after mount, client-only. Both the server
    // render and the client's pre-mount render return `null`, so there's
    // nothing to mismatch (unlike the theme-preference bug — see
    // shared/theme/README.md — this one is careful to keep both renders
    // identical instead of branching on `typeof window`).
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Body scroll lock while open — without it, the page behind the drawer
    // keeps scrolling on touch devices, which reads as broken, not "modal."
    React.useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    React.useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    if (!mounted) {
        return null;
    }

    return createPortal(
        <>
            <div
                className={cn(
                    "fixed inset-0 z-overlay bg-overlay-scrim",
                    "transition-opacity duration-normal ease-standard",
                    open ? "opacity-100" : "opacity-0 pointer-events-none",
                )}
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-hidden={!open}
                // `inert` (not just aria-hidden) keeps focus/tab order from
                // ever reaching links inside the panel while it's visually
                // off-screen — aria-hidden alone doesn't stop keyboard focus.
                inert={!open}
                {...rest}
                className={cn(
                    "fixed top-0 bottom-0 z-overlay",
                    "w-[min(320px,85vw)]",
                    "bg-surface-base",
                    "flex flex-col",
                    "transition-transform duration-normal ease-standard",
                    side === "right" ? "right-0 border-l border-border-subtle" : "left-0 border-r border-border-subtle",
                    open ? "translate-x-0" : side === "right" ? "translate-x-full" : "-translate-x-full",
                )}
            >
                {children}
            </div>
        </>,
        document.body,
    );
}
