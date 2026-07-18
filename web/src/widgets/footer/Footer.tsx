"use client";

import * as React from "react";
import { Text } from "@/shared/ui/text";
import { useTranslation } from "@/shared/i18n";
import { site } from "@/data/config";
import { cn } from "@/shared/lib/utils";

export function Footer() {
    const { ln } = useTranslation();
    const year = new Date().getFullYear();

    return (
        <footer
            className={cn(
                "w-full max-w-[var(--layout-content-max-width)] mx-auto",
                "px-[clamp(20px,4vw,56px)] pt-lg pb-xl",
                "flex flex-wrap items-center justify-between gap-sm",
                "border-t border-border-subtle",
            )}
        >
            <Text variant="caption" tone="faint" className="font-mono">
                {ln("footer.copyright", { year, name: site.name })}
            </Text>
            <div className="flex items-center gap-lg">
                <a href={site.social.github} target="_blank" rel="noreferrer" className="text-caption text-text-muted">
                    {ln("footer.github")}
                </a>
                <a href={site.social.linkedin} target="_blank" rel="noreferrer" className="text-caption text-text-muted">
                    {ln("footer.linkedin")}
                </a>
                <a href={`mailto:${site.email}`} className="text-caption text-text-muted">
                    {ln("footer.email")}
                </a>
            </div>
        </footer>
    );
}
