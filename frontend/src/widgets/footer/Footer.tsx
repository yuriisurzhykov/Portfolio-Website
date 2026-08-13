"use client";

import * as React from "react";
import type { ConfigContent } from "@portfolio/backend";
import { Text } from "@/shared/ui/text";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";

const DEFAULT_CLASS_NAMES = cn(
    "text-caption",
    "text-text-muted",
    "transition-all",
    "duration-normal",
    "hover:text-text-primary",
    "hover:font-semibold"
)

export interface FooterProps {
    config: ConfigContent;
}

export function Footer({config: site}: FooterProps) {
    const {ln} = useTranslation();
    const year = new Date().getFullYear();

    return (
        <footer
            className={ cn(
                "w-full max-w-(--layout-content-max-width) mx-auto",
                "px-[clamp(20px,4vw,56px)] pt-lg pb-xl",
                "flex flex-wrap items-center justify-between gap-sm",
                "border-t border-border-subtle",
            ) }
        >
            <Text variant="caption" tone="faint" className={ DEFAULT_CLASS_NAMES }>
                { ln("footer.copyright", {year, name: site.name}) }
            </Text>
            <div className="flex items-center gap-lg">
                <a href={ site.social.github } target="_blank" rel="noreferrer"
                   className={ DEFAULT_CLASS_NAMES }>
                    { ln("footer.github") }
                </a>
                <a href={ site.social.linkedin } target="_blank" rel="noreferrer"
                   className={ DEFAULT_CLASS_NAMES }>
                    { ln("footer.linkedin") }
                </a>
                <a href={ `mailto:${ site.email }` } className={ DEFAULT_CLASS_NAMES }>
                    { ln("footer.email") }
                </a>
            </div>
        </footer>
    );
}
