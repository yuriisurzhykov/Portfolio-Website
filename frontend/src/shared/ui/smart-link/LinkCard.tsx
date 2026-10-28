"use client";

import * as React from "react";
import type { LinkPreviewView } from "@portfolio/backend";
import { cn } from "@/shared/lib/utils";
import { accentTintForHue } from "@/shared/lib/hue-accent";
import { useTranslation } from "@/shared/i18n";
import { CoverImage } from "@/shared/ui/cover-image";
import { SiteIcon } from "./SiteIcon";
import { SmartLinkAnchor } from "./SmartLinkAnchor";
import { useKindLabel } from "./useKindLabel";

export interface LinkCardProps {
    preview: LinkPreviewView;
    title?: string;
    className?: string;
}

/**
 * The full preview (mockup "3. Полная карточка", the Confluence-style
 * embed): og:image on top — or, when the page has none, its icon large on
 * a quiet panel — then domain, title, two lines of description and an
 * "Open ↗" footer. The image goes through `CoverImage`, so it gets the same
 * blur-up placeholder and no layout shift as post covers.
 */
export function LinkCard({ preview, title, className }: LinkCardProps) {
    const { ln } = useTranslation();
    const kindLabel = useKindLabel(preview);
    const internal = preview.kind !== "external";
    const tinted = preview.hue === null ? undefined : { borderColor: accentTintForHue(preview.hue, 0.35) };

    return (
        <SmartLinkAnchor
            href={ preview.url }
            internal={ internal }
            className={ cn(
                "group flex flex-col overflow-hidden rounded-xl border border-border-default bg-surface-base no-underline text-text-primary",
                "transition-colors duration-fast hover:border-accent-solid",
                "focus-visible:outline-none focus-visible:shadow-focus-ring",
                className,
            ) }
            style={ tinted }
        >
            { preview.image ? (
                <CoverImage { ...preview.image } className="w-full h-auto border-b border-border-subtle"/>
            ) : (
                <span aria-hidden="true" className="flex h-40 items-center justify-center gap-sm border-b border-border-subtle bg-surface-raised">
                    <SiteIcon preview={ preview } size="lg"/>
                    <span className="font-mono text-caption text-text-muted">{ preview.domain }</span>
                </span>
            ) }
            <span className="flex flex-col gap-xs px-lg pt-md pb-lg">
                <span className="flex items-center gap-xs">
                    <SiteIcon preview={ preview } size="sm"/>
                    <span className="truncate font-mono text-caption text-text-muted">{ kindLabel }</span>
                </span>
                <span className="text-h3 font-semibold leading-tight">{ title || preview.title }</span>
                { preview.description && (
                    <span className="line-clamp-2 text-body text-text-secondary">{ preview.description }</span>
                ) }
                <span className="mt-xs flex items-center justify-between gap-sm border-t border-border-subtle pt-sm">
                    <span className="truncate font-mono text-caption text-text-muted">{ internal ? preview.url : preview.domain }</span>
                    <span className="shrink-0 text-caption font-semibold text-accent-text">
                        { internal ? `${ ln("smartLink.openInternal") } →` : `${ ln("smartLink.openExternal") } ↗` }
                    </span>
                </span>
            </span>
        </SmartLinkAnchor>
    );
}
