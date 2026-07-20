"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { adminApi } from "@/shared/lib/admin-api";

const links = [
    { href: "/admin/journal", label: "Journal" },
    { href: "/admin/work", label: "Work" },
    { href: "/admin/settings", label: "Settings" },
];

function navLinkClass(isActive: boolean) {
    return cn(
        "font-medium text-caption transition-colors duration-fast",
        isActive ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
    );
}

/**
 * Chrome for every route under `/admin` except `/admin/login` (that page
 * sits outside this layout — see `app/admin/(dashboard)/layout.tsx` — a
 * logout button on the login screen itself would make no sense). Nowhere
 * near as elaborate as the public `<Nav/>` on purpose: no mobile drawer,
 * no i18n, no theme toggle — this is a tool only the site owner ever
 * sees, in whatever language/theme their own browser/OS is already in.
 */
export function AdminNav() {
    const pathname = usePathname();
    const router = useRouter();
    const [loggingOut, setLoggingOut] = React.useState(false);

    async function handleLogout() {
        setLoggingOut(true);
        try {
            await adminApi.logout();
        } finally {
            // Navigate regardless of whether the logout call itself
            // succeeded — proxy.ts will redirect back to /admin/login on
            // the very next request anyway once the access-token cookie is
            // gone/expired; a failed logout call shouldn't trap the admin
            // on a page they're trying to leave.
            router.push("/admin/login");
            router.refresh();
        }
    }

    return (
        <header className="sticky top-0 z-navbar flex items-center justify-between gap-sm px-[clamp(16px,4vw,56px)] py-md bg-overlay-scrim backdrop-blur-md border-b border-border-subtle">
            <div className="flex items-center gap-lg">
                <Link href="/admin/journal" className="font-mono font-bold text-body text-text-primary shrink-0">
                    Admin
                </Link>
                <nav className="flex items-center gap-md">
                    {links.map((link) => (
                        <Link key={link.href} href={link.href} className={navLinkClass(pathname.startsWith(link.href))}>
                            {link.label}
                        </Link>
                    ))}
                </nav>
            </div>

            <Button variant="ghost" size="sm" onClick={handleLogout} loading={loggingOut} iconLeft={<LogOut className="w-4 h-4" aria-hidden="true" />}>
                Log out
            </Button>
        </header>
    );
}
