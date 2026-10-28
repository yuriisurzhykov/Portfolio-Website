"use client";

import * as React from "react";
import type { LinkPreviewView } from "@portfolio/backend";
import { cn } from "@/shared/lib/utils";
import { accentTintForHue } from "@/shared/lib/hue-accent";
import { useTranslation } from "@/shared/i18n";
import { SiteIcon } from "./SiteIcon";
import { SmartLinkAnchor } from "./SmartLinkAnchor";
import { useKindLabel } from "./useKindLabel";

export interface LinkRowProps {
    preview: LinkPreviewView;
    title?: string;
    className?: string;
}

/**
 * The compact block variant (mockup "2. Компактная строка"): one row the
 * width of the reading column — icon, title, domain, a small thumbnail when
 * there is an image. For when the link matters but a full card would
 * outweigh the paragraph around it.
 */
export function LinkRow({ preview, title, className }: LinkRowProps) {
    const { ln } = useTranslation();
    const kindLabel = useKindLabel(preview);
    const internal = preview.kind !== "external";
    const tinted = preview.hue === null ? undefined : { borderColor: accentTintForHue(preview.hue, 0.3), backgroundColor: accentTintForHue(preview.hue, 0.06) };

    return (
        <SmartLinkAnchor
            href={ preview.url }
            internal={ internal }
            className={ cn(
                "group flex items-center gap-sm p-sm rounded-xl border no-underline text-text-primary",
                "transition-colors duration-fast",
                preview.hue === null && "border-border-subtle bg-surface-base hover:border-accent-solid",
                "focus-visible:outline-none focus-visible:shadow-focus-ring",
                className,
            ) }
            style={ tinted }
        >
            <SiteIcon preview={ preview } size="md"/>
            <span className="flex min-w-0 flex-1 flex-col gap-xxs">
                <span className="truncate text-body font-semibold">{ title || preview.title }</span>
                <span className="truncate font-mono text-caption text-text-muted">{ kindLabel }</span>
            </span>
            { preview.image && (
                <span aria-hidden="true" className="hidden sm:block h-14 w-24 shrink-0 overflow-hidden rounded-md border border-border-subtle bg-surface-placeholder-a bg-cover bg-center" style={ { backgroundImage: `url(${ preview.image.placeholder || preview.image.src })` } }>
                    {/* eslint-disable-next-line @next/next/no-img-element -- re-hosted thumbnail from /media */ }
                    <img src={ preview.image.src } alt="" loading="lazy" decoding="async" className="block h-full w-full object-cover"/>
                </span>
            ) }
            <span className="shrink-0 text-body text-text-muted transition-colors group-hover:text-accent-text" aria-hidden="true">
                { internal ? "→" : "↗" }
            </span>
            { !internal && <span className="sr-only">{ ln("smartLink.opensInNewTab") }</span> }
        </SmartLinkAnchor>
    );
}
