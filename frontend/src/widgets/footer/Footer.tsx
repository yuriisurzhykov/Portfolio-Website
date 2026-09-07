"use client";

import * as React from "react";
import type { ConfigContent } from "@portfolio/backend";
import { Text } from "@/shared/ui/text";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import { TechIconView } from "@/shared/lib/tech-icons";
import { TechIcon } from "@/shared/ui/tech-icon";

const DEFAULT_CLASS_NAMES = cn(
    "text-caption",
    "text-text-muted",
    "transition-all",
    "duration-normal",
    "hover:text-text-primary",
    "hover:font-semibold"
)

const ICON_CLASS_NAMES = cn(
    "block h-lg aspect-square w-auto shrink-0 text-text-muted",
    "transition-colors duration-normal motion-reduce:transition-none",
    "group-hover:text-text-primary group-focus-visible:text-text-primary",
);

const LABEL_TRACK_CLASS_NAMES = cn(
    "grid grid-cols-[0fr]",
    "group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr]",
    "transition-[grid-template-columns] duration-normal ease-standard motion-reduce:transition-none",
);
const LABEL_CLASS_NAMES = cn(
    "min-w-0 overflow-hidden whitespace-nowrap text-text-muted",
    "transition-colors duration-normal motion-reduce:transition-none",
    "group-hover:text-text-primary group-hover:font-semibold",
    "group-focus-visible:text-text-primary group-focus-visible:font-semibold",
);

export interface FooterProps {
    config: ConfigContent;
    socialIcons: { github: TechIconView; linkedin: TechIconView };
}

function RefLink({ href, icon, children }: {
    href: string,
    icon: TechIconView,
    children: React.ReactNode
}) {
    return (
        <a
            href={ href }
            aria-label={ typeof children === "string" ? children : undefined }
            className="group inline-flex items-center gap-xxs">
            <TechIcon
                icon={ icon }
                className={ cn(
                    "h-lg aspect-square w-auto shrink-0 text-text-muted",
                    "transition-colors duration-normal motion-reduce:transition-none",
                    "group-hover:text-text-primary group-focus-visible:text-text-primary",
                ) }/>
            <span className={ cn(
                "grid overflow-hidden",
                "grid-cols-[0fr]",
                "group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr]",
                "transition-grid-template-columns duration-normal motion-reduce:transition-none",
            ) }>
                <Text variant="caption" tone="faint" className={ DEFAULT_CLASS_NAMES }>
                    { children }
                </Text>
            </span>
        </a>
    );
}

export function Footer({ config: site, socialIcons }: FooterProps) {
    const { ln } = useTranslation();
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
                { ln("footer.copyright", { year, name: site.name }) }
            </Text>
            <div className="flex items-center gap-lg">
                <RefLink href={ site.social.github } icon={ socialIcons.github }>
                    { ln("footer.github") }
                </RefLink>
                <RefLink href={ site.social.linkedin } icon={ socialIcons.linkedin }>
                    { ln("footer.linkedin") }
                </RefLink>
                <RefLink href={ "mailto:" + site.email } icon={ { kind: "none" } }>
                    { ln("footer.email") }
                </RefLink>
            </div>
        </footer>
    );
}
