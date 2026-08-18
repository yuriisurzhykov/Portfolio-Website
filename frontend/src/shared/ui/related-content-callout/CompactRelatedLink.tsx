import * as React from "react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";

export interface CompactRelatedLinkProps {
    href: string;
    label: string;
    className?: string;
}

/**
 * A small link to related content with a VISIBLE label — for list/card
 * contexts where a full `RelatedContentCallout` would be too heavy (an
 * admin list row's "linked to: <slug>" indicator, or a compact ledger
 * row). Added 2026-08-11 alongside `RelatedContentCallout` specifically
 * because `WorkListPage`'s ledger row used to fall back to linking the
 * WHOLE ROW at a related post's `/journal/:slug` with nothing but a bare
 * "→" arrow to show for it — indistinguishable from a normal "view this
 * project's own case study" row. This component exists so that link can
 * say what it actually goes to, instead of staying silent about it.
 */
export function CompactRelatedLink({ href, label, className }: CompactRelatedLinkProps) {
    return (
        <Link
            href={href}
            className={cn(
                "inline-flex items-center gap-1 font-mono text-caption text-text-muted",
                "hover:text-text-primary transition-colors duration-fast",
                className,
            )}
        >
            <span aria-hidden="true">↗</span>
            {label}
        </Link>
    );
}
