import * as React from "react";
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Nav } from "@/widgets/nav";
import { Footer } from "@/widgets/footer";

/**
 * On every route change: jump to the target section if the URL has a hash
 * (e.g. nav "Contact" linking to "/#contact" from another page), otherwise
 * scroll to the top of the new page.
 */
function useScrollToLocation() {
    const { pathname, hash } = useLocation();

    useEffect(() => {
        if (hash) {
            const id = hash.slice(1);
            const target = document.getElementById(id);
            if (target) {
                target.scrollIntoView({ behavior: "smooth" });
                return;
            }
        }
        window.scrollTo({ top: 0 });
    }, [pathname, hash]);
}

export function AppLayout() {
    useScrollToLocation();

    return (
        <div className="min-h-screen bg-bg-app text-text-primary flex flex-col">
            <Nav />
            <div className="flex-1">
                <Outlet />
            </div>
            <Footer />
        </div>
    );
}
