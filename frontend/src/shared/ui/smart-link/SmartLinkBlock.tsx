"use client";

import * as React from "react";
import type { LinkPreviewView } from "@portfolio/backend";
import { cn } from "@/shared/lib/utils";
import { useLinkPreview } from "./LinkPreviewContext";
import { LinkCard } from "./LinkCard";
import { LinkRow } from "./LinkRow";
import { displayDomainOf } from "./display-domain";

export interface SmartLinkBlockProps {
    url: string;
    view: "row" | "card";
    titleOverride?: string;
    /** Overrides the context lookup — the admin editor passes the preview it just fetched itself. */
    preview?: LinkPreviewView | null;
    className?: string;
}

/**
 * A `linkCard` block: the row or the card, or — with no usable preview —
 * a plain link that still says where it goes (the mockups' "Нет данных"
 * state). Never throws and never renders empty, whatever the snapshot's state.
 */
export function SmartLinkBlock({ url, view, titleOverride, preview: given, className }: SmartLinkBlockProps) {
    const fromContext = useLinkPreview(url);
    const preview = given === undefined ? fromContext : given ?? undefined;

    if (!preview || !(titleOverride || preview.title)) {
        return (
            <p className={ cn("m-0", className) }>
                <a href={ url } className="font-mono text-caption text-text-primary underline decoration-dotted decoration-text-muted underline-offset-4">
                    { titleOverride || displayDomainOf(url) } ↗
                </a>
            </p>
        );
    }

    return view === "card"
        ? <LinkCard preview={ preview } title={ titleOverride } className={ className }/>
        : <LinkRow preview={ preview } title={ titleOverride } className={ className }/>;
}
