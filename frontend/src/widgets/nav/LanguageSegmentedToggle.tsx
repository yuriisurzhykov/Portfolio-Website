"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import type { Language } from "@/shared/i18n";
import { RU_PREFIX } from "@/shared/lib/locale-constants";

const OPTIONS: Language[] = ["en", "ru"];

/** Strips a leading `/ru` (or `/ru/...`) segment, mirroring `proxy.ts`'s `handleLocale` rewrite target — the un-prefixed path this URL renders through either way. */
function stripRuPrefix(pathname: string): string {
    if (pathname === RU_PREFIX) return "/";
    if (pathname.startsWith(`${RU_PREFIX}/`)) return pathname.slice(RU_PREFIX.length);
    return pathname;
}

function hrefFor(language: Language, unprefixedPath: string): string {
    if (language === "en") return unprefixedPath;
    return unprefixedPath === "/" ? RU_PREFIX : `${RU_PREFIX}${unprefixedPath}`;
}

/**
 * LanguageSegmentedToggle
 * ------------------------
 * EN / RU pill in the public nav — now a pair of real links to the `/ru`-
 * prefixed (or un-prefixed) version of the CURRENT page, not a button that
 * flips a client-only React state. That's the whole point of Phase 1's
 * routing change (see the migration plan): the language is a URL now, so
 * switching it has to be a navigation, not a state update the server
 * never finds out about.
 *
 * Deliberately plain `<a>` elements, not `next/link`'s `<Link>` — a real,
 * full browser navigation is what actually re-runs `proxy.ts` and re-
 * renders the whole tree (including `RootLayout`, which resolves
 * `initialLanguage` once per request) with the new locale header. A
 * `<Link>`'s client-side soft navigation would ask the App Router to patch
 * in a new page segment without any guarantee `RootLayout` — a shared
 * ancestor layout — gets re-invoked, which is exactly the SSR-locale
 * correctness this toggle exists to preserve.
 */
export function LanguageSegmentedToggle() {
    const { language, ln } = useTranslation();
    const pathname = usePathname();
    const unprefixedPath = stripRuPrefix(pathname);

    const labels: Record<Language, string> = {
        en: ln("label.button.language.en"),
        ru: ln("label.button.language.ru"),
    };

    return (
        <div className="flex items-center gap-[2px] bg-surface-icon border border-border-subtle rounded-pill p-[3px]">
            {OPTIONS.map((option) => {
                const isActive = language === option;
                return (
                    <a
                        key={option}
                        href={hrefFor(option, unprefixedPath)}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                            "rounded-pill px-[10px] py-[5px]",
                            "font-mono font-semibold text-[10.5px] uppercase",
                            "transition-colors duration-fast",
                            isActive ? "bg-text-primary text-bg-app" : "text-text-muted hover:text-text-primary",
                        )}
                    >
                        {labels[option]}
                    </a>
                );
            })}
        </div>
    );
}
