"use client";

import * as React from "react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Nav } from "@/widgets/nav";
import { Footer } from "@/widgets/footer";

/**
 * On every route change: jump to the target section if the URL has a hash
 * (e.g. nav "Contact" linking to "/#contact" from another page), otherwise
 * scroll to the top of the new page.
 *
 * Ported from react-router's `useLocation()` (pathname + hash together) to
 * Next.js's `usePathname()` (pathname only — App Router doesn't surface the
 * hash through routing hooks) plus a manual `window.location.hash` read.
 */
function useScrollToLocation() {
    const pathname = usePathname();

    useEffect(() => {
        const hash = window.location.hash;

        if (hash) {
            const id = hash.slice(1);
            const target = document.getElementById(id);
            if (target) {
                target.scrollIntoView({ behavior: "smooth" });
                return;
            }
        }
        window.scrollTo({ top: 0 });
    }, [pathname]);
}

export function AppLayout({ children }: { children: React.ReactNode }) {
    useScrollToLocation();

    return (
        <div className="min-h-screen bg-bg-app text-text-primary flex flex-col">
            <Nav />
            <div className="flex-1">
                {children}
            </div>
            <Footer />
        </div>
    );
}
