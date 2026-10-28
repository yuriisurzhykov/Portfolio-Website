"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { accentTintForHue } from "@/shared/lib/hue-accent";
import { SiteIcon } from "./SiteIcon";
import { SmartLinkAnchor } from "./SmartLinkAnchor";
import { useLinkPreview } from "./LinkPreviewContext";
import { useTranslation } from "@/shared/i18n";

export interface SmartLinkBadgeProps {
    href: string;
    /** The link text the author wrote — shown when the page has no title of its own, and the accessible name's first half either way. */
    children: React.ReactNode;
}

/**
 * The inline variant (mockup "1. Бейдж в тексте"): sits inside a sentence
 * at text height — icon, title, then ↗ for an external page or a
 * "project"/"post" label for own content. With no preview for `href` it is
 * exactly the plain link `Markdown` would have rendered, so a missing
 * snapshot never breaks a sentence.
 */
export function SmartLinkBadge({ href, children }: SmartLinkBadgeProps) {
    const preview = useLinkPreview(href);
    const { ln } = useTranslation();

    if (!preview) {
        return <a href={ href }>{ children }</a>;
    }

    const internal = preview.kind !== "external";
    const tinted = preview.hue === null ? undefined : { borderColor: accentTintForHue(preview.hue, 0.35), backgroundColor: accentTintForHue(preview.hue, 0.08) };

    return (
        <SmartLinkAnchor
            href={ href }
            internal={ internal }
            title={ preview.description ?? undefined }
            className={ cn(
                "inline-flex items-center gap-1.5 align-baseline mx-0.5 py-px pl-1 pr-2 rounded-sm border",
                "font-medium text-text-primary no-underline leading-normal",
                "transition-colors duration-fast",
                preview.hue === null && "border-border-default bg-surface-raised hover:border-accent-solid hover:bg-accent-tint-bg",
                preview.hue !== null && "hover:brightness-110",
                "focus-visible:outline-none focus-visible:shadow-focus-ring",
            ) }
            style={ tinted }
        >
            <SiteIcon preview={ preview } size="sm"/>
            <span>{ preview.title ?? children }</span>
            { internal ? (
                <span className="font-mono text-micro text-text-muted">{ ln(preview.kind === "work" ? "smartLink.kind.work" : "smartLink.kind.post") }</span>
            ) : (
                <span aria-hidden="true" className="text-micro text-text-muted">↗</span>
            ) }
        </SmartLinkAnchor>
    );
}
