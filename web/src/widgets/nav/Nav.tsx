"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ConfigContent } from "@portfolio/backend";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Drawer } from "@/shared/ui/drawer";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import { useHideOnScroll } from "@/shared/lib/useHideOnScroll";
import { ThemeSegmentedToggle } from "./ThemeSegmentedToggle";
import { LanguageSegmentedToggle } from "./LanguageSegmentedToggle";

const navLinkClass = (isActive: boolean) =>
    cn(
        "font-medium text-caption transition-colors duration-fast",
        isActive ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
    );

const mobileNavLinkClass = (isActive: boolean) =>
    cn(
        "font-medium text-body-lg py-sm transition-colors duration-fast",
        isActive ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
    );

/**
 * Next.js's `usePathname()` doesn't report the URL hash (App Router strips
 * it — hash navigation is a browser-only concept, not part of server
 * routing). Track it manually so the "Contact" nav item can still highlight
 * when the URL is "/#contact", matching the previous react-router behavior.
 */
function useUrlHash(): string {
    const [hash, setHash] = React.useState("");

    React.useEffect(() => {
        const updateHash = () => setHash(window.location.hash);
        updateHash();
        window.addEventListener("hashchange", updateHash);
        return () => window.removeEventListener("hashchange", updateHash);
    }, []);

    return hash;
}

export interface NavProps {
    config: ConfigContent;
}

export function Nav({ config: site }: NavProps) {
    const { ln } = useTranslation();
    const pathname = usePathname();
    const hash = useUrlHash();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const hiddenOnScroll = useHideOnScroll();

    // Found via a live mobile-viewport screenshot, not a design review: the
    // header was cramming the logo, three nav links, the language toggle,
    // the theme toggle, and the status badge into one row on narrow
    // screens — visibly wider than the content column below it, wrapping
    // awkwardly. Below `sm`, the header now only shows the logo and a
    // hamburger button; everything else moves into this slide-in panel.
    // `sm:` and up keep the original single-row layout unchanged.
    React.useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    const navLinks = (
        <>
            <Link href="/work" className={navLinkClass(pathname === "/work")}>
                {ln("nav.work")}
            </Link>
            <Link href="/journal" className={navLinkClass(pathname === "/journal")}>
                {ln("nav.journal")}
            </Link>
            <Link href="/#contact" className={navLinkClass(hash === "#contact")}>
                {ln("nav.contact")}
            </Link>
        </>
    );

    return (
        <header
            className={cn(
                "sticky top-0 z-navbar",
                "flex items-center justify-between gap-sm",
                "px-[clamp(16px,4vw,56px)] py-lg",
                "bg-overlay-scrim backdrop-blur-md",
                "border-b border-border-subtle",
                // Stays put through the hero (useHideOnScroll only starts
                // reporting `true` past its reveal threshold — see the
                // hook), hides on scroll-down past that point, and slides
                // back the moment the visitor scrolls up at all. The FAB
                // in AppLayout.tsx (`<BackToTop/>`) uses the exact same
                // hook/threshold, so it appears exactly when this
                // disappears — see its own comment for why that's two
                // independent hook calls rather than one shared value.
                "transition-transform duration-normal ease-standard",
                hiddenOnScroll && "-translate-y-full",
            )}
        >
            <Link href="/" className="font-mono font-bold text-body text-text-primary shrink-0">
                {site.initials}
            </Link>

            <nav className="hidden sm:flex items-center gap-[16px] sm:gap-[28px]">
                {navLinks}
            </nav>

            <div className="hidden sm:flex items-center gap-xs sm:gap-sm shrink-0">
                <LanguageSegmentedToggle />
                <ThemeSegmentedToggle />
                <StatusBadge tone="success" withDot className="whitespace-nowrap">
                    <span className="hidden lg:inline">{ln(`status.${site.availability}`)}</span>
                </StatusBadge>
            </div>

            <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="sm:hidden p-xs rounded-md text-text-primary hover:bg-surface-raised transition-colors duration-fast"
                aria-label={ln("label.aria.mobileMenu.open")}
                aria-expanded={mobileMenuOpen}
            >
                <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            <Drawer
                open={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                aria-label={ln("label.aria.mobileMenu.panel")}
            >
                <div className="flex items-center justify-between px-lg py-lg border-b border-border-subtle">
                    <span className="font-mono font-bold text-body text-text-primary">{site.initials}</span>
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-xs rounded-md text-text-primary hover:bg-surface-raised transition-colors duration-fast"
                        aria-label={ln("label.aria.mobileMenu.close")}
                    >
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                <nav className="flex flex-col px-lg py-lg gap-xs" onClick={() => setMobileMenuOpen(false)}>
                    <Link href="/work" className={mobileNavLinkClass(pathname === "/work")}>
                        {ln("nav.work")}
                    </Link>
                    <Link href="/journal" className={mobileNavLinkClass(pathname === "/journal")}>
                        {ln("nav.journal")}
                    </Link>
                    <Link href="/#contact" className={mobileNavLinkClass(hash === "#contact")}>
                        {ln("nav.contact")}
                    </Link>
                </nav>

                <div className="mt-auto flex flex-col gap-md px-lg py-lg border-t border-border-subtle">
                    <div className="flex items-center gap-sm">
                        <LanguageSegmentedToggle />
                        <ThemeSegmentedToggle />
                    </div>
                    <StatusBadge tone="success" withDot className="w-fit whitespace-nowrap">
                        {ln(`status.${site.availability}`)}
                    </StatusBadge>
                </div>
            </Drawer>
        </header>
    );
}
