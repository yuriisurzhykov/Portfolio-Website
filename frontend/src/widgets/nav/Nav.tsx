import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { StatusBadge } from "@/shared/ui/status-badge";
import { useTranslation } from "@/shared/i18n";
import { site } from "@/data/config";
import { cn } from "@/shared/lib/utils";
import { ThemeSegmentedToggle } from "./ThemeSegmentedToggle";

const navLinkClass = (isActive: boolean) =>
    cn(
        "font-medium text-caption transition-colors duration-fast",
        isActive ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
    );

export function Nav() {
    const { ln } = useTranslation();
    const { hash } = useLocation();

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
            <NavLink to="/" className="font-mono font-bold text-body text-text-primary shrink-0">
                {site.initials}
            </NavLink>

            <nav className="flex items-center gap-[16px] sm:gap-[28px]">
                <NavLink to="/work" className={({ isActive }) => navLinkClass(isActive)}>
                    {ln("nav.work")}
                </NavLink>
                <NavLink to="/journal" className={({ isActive }) => navLinkClass(isActive)}>
                    {ln("nav.journal")}
                </NavLink>
                <NavLink to="/#contact" className={navLinkClass(hash === "#contact")}>
                    {ln("nav.contact")}
                </NavLink>
            </nav>

            <div className="flex items-center gap-xs sm:gap-sm shrink-0">
                <ThemeSegmentedToggle />
                <StatusBadge tone="success" withDot className="whitespace-nowrap">
                    <span className="hidden lg:inline">{ln(`status.${site.availability}`)}</span>
                </StatusBadge>
            </div>
        </header>
    );
}
