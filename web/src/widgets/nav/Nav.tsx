"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StatusBadge } from "@/shared/ui/status-badge";
import { useTranslation } from "@/shared/i18n";
import { site } from "@/data/config";
import { cn } from "@/shared/lib/utils";
import { ThemeSegmentedToggle } from "./ThemeSegmentedToggle";
import { LanguageSegmentedToggle } from "./LanguageSegmentedToggle";

const navLinkClass = (isActive: boolean) =>
    cn(
        "font-medium text-caption transition-colors duration-fast",
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

export function Nav() {
    const { ln } = useTranslation();
    const pathname = usePathname();
    const hash = useUrlHash();

    return (
        <header
            className={cn(
                "sticky top-0 z-navbar",
                "flex items-center justify-between gap-sm",
                "px-[clamp(16px,4vw,56px)] py-lg",
                "bg-overlay-scrim backdrop-blur-md",
                "border-b border-border-subtle",
            )}
        >
            <Link href="/" className="font-mono font-bold text-body text-text-primary shrink-0">
                {site.initials}
            </Link>

            <nav className="flex items-center gap-[16px] sm:gap-[28px]">
                <Link href="/work" className={navLinkClass(pathname === "/work")}>
                    {ln("nav.work")}
                </Link>
                <Link href="/journal" className={navLinkClass(pathname === "/journal")}>
                    {ln("nav.journal")}
                </Link>
                <Link href="/#contact" className={navLinkClass(hash === "#contact")}>
                    {ln("nav.contact")}
                </Link>
            </nav>

            <div className="flex items-center gap-xs sm:gap-sm shrink-0">
                <LanguageSegmentedToggle />
                <ThemeSegmentedToggle />
                <StatusBadge tone="success" withDot className="whitespace-nowrap">
                    <span className="hidden lg:inline">{ln(`status.${site.availability}`)}</span>
                </StatusBadge>
            </div>
        </header>
    );
}
