import * as React from "react";
import type { LinkPreviewView } from "@portfolio/backend";
import { cn } from "@/shared/lib/utils";
import { accentColorForHue, accentTintForHue } from "@/shared/lib/hue-accent";

const SIZE_CLASSES = {
    sm: "size-4 rounded-xs text-micro",
    md: "size-10 rounded-md text-body",
    lg: "size-14 rounded-xl text-h3",
} as const;

export interface SiteIconProps {
    preview: LinkPreviewView;
    size: keyof typeof SIZE_CLASSES;
    className?: string;
}

/**
 * The site's favicon when one was re-hosted, otherwise the first letter of
 * its domain on a quiet tile (the mockups' "G"/"K" tiles); this site's own
 * Work/Post get a tile in their identity hue. Always decorative —
 * the domain or title next to it already says what it is.
 */
export function SiteIcon({ preview, size, className }: SiteIconProps) {
    const classes = cn("inline-flex shrink-0 items-center justify-center overflow-hidden font-mono font-bold", SIZE_CLASSES[size], className);

    if (preview.faviconUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element -- a 64px re-hosted icon from /media; next/image adds nothing here
            <img src={ preview.faviconUrl } alt="" aria-hidden="true" width={ 64 } height={ 64 } loading="lazy" className={ cn(classes, "bg-surface-icon object-contain") }/>
        );
    }

    const letter = (preview.kind === "external" ? preview.domain : preview.title ?? "")[0]?.toUpperCase() ?? "·";
    const style = preview.hue === null ? undefined : { color: accentColorForHue(preview.hue), backgroundColor: accentTintForHue(preview.hue, 0.16) };
    return (
        <span aria-hidden="true" className={ cn(classes, preview.hue === null && "bg-surface-icon border border-border-subtle text-text-secondary") } style={ style }>
            { letter }
        </span>
    );
}
