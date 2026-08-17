"use client";

import * as React from "react";
import Link from "next/link";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { TechIcon } from "@/shared/ui/tech-icon";
import { Tooltip } from "@/shared/ui/tooltip";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import type { TechStackItemView } from "../tech-stack-view";

export interface TechStackProps {
    techStack: TechStackItemView[];
}

/**
 * Shared by both the clickable (`hasProjects`) and inert branches below —
 * every logo gets the exact same accent hover/press/focus treatment
 * regardless of whether it links anywhere, per the actual ask ("icons
 * should stand out with an accent color on hover AND pressed"), not just
 * the ones that happen to be links. Colors apply straight to the SVG's
 * `fill="currentColor"` (`TechIcon`) — no per-brand color overrides
 * needed, since every Simple Icons path is monochrome-ready by design.
 *
 * The size (`w-[26px] h-[26px]`) lives HERE, on the wrapping Link/span —
 * never passed as `TechIcon`'s own `className` — because `TechIcon`
 * already defaults to `w-full h-full` internally, and this repo's `cn()`
 * is a plain `clsx`, not `tailwind-merge`: two conflicting width/height
 * utility classes on the SAME element don't override each other by source
 * order, whichever one happens to come later in the compiled stylesheet
 * wins. Found live (not just reasoned about) — this exact mistake once
 * shipped `w-[26px]`/`h-[26px]` alongside `TechIcon`'s internal
 * `w-full h-full` on the same `<svg>`, and `w-full`/`h-full` won,
 * rendering every logo at the size of its nearest sized ancestor (in
 * practice, most of the viewport). See `TechIcon.tsx`'s own comment for
 * the same rule from the component's side.
 */
/**
 * `h-[min(1.5rem,28px)]`, not the plain `h-lg` token (`1.5rem`) this
 * otherwise matches — every Tailwind spacing utility, `h-lg` included,
 * resolves through `rem`, which scales with the user's OS/browser text-size
 * preference (iOS's "Larger Accessibility Sizes" can multiply the root
 * font-size several times over). Reproduced live: forcing a large root
 * `font-size` collapses this row from several logos per line down to a
 * single logo per line — each icon's footprint (its own box, `gap-x-lg`
 * between them) grows right along with body text, so fewer fit per row,
 * down to one at the extreme end, which reads as "a column, not a row."
 * `min(1.5rem, 28px)` keeps today's exact rendered size at a normal
 * (16px-root) setting untouched, but stops this one decorative logo row
 * from growing past a small px ceiling no matter how far text-size
 * preference is pushed — reasonable here specifically because these are
 * brand marks, not body copy a low-vision user actually needs to read
 * larger; `gap-x-lg`/`gap-y-md` on the `<ul>` below get the same treatment
 * so the per-icon footprint (box + gap) stays bounded, not just the box.
 */
const iconInteractiveClasses = cn(
    "block h-[min(1.5rem,28px)] aspect-square w-auto rounded-sm text-text-muted",
    "transition-colors duration-fast ease-standard motion-reduce:transition-none",
    "hover:text-accent-solid",
    "active:text-accent-solid-hover active:scale-press",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-highlight focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app",
);

export function TechStack({ techStack }: TechStackProps) {
    const { ln } = useTranslation();

    // Nothing to render if every configured row failed to resolve a real
    // logo (`buildTechStackView` already dropped those) — same "render
    // nothing, don't show an empty shell" convention as `JournalPreview`
    // when there's no post yet.
    if (techStack.length === 0) {
        return null;
    }

    return (
        <section
            className="max-w-(--layout-content-max-width) mx-auto px-(--layout-section-horizontal-padding) pb-[clamp(56px,7vw,80px)]">
            <div className="flex flex-col sm:flex-row sm:items-center gap-md sm:gap-lg">
                <Eyebrow className="shrink-0">{ ln("eyebrow.stack") }</Eyebrow>
                <span aria-hidden className="hidden sm:block h-lg w-px bg-border-subtle shrink-0"/>
                <ul className="flex flex-wrap items-center gap-x-[min(1.5rem,24px)] gap-y-[min(1rem,16px)] list-none m-0 p-0">
                    { techStack.map((item) => (
                        <li key={ item.name }>
                            <Tooltip label={ item.name }>
                                { item.hasProjects ? (
                                    <Link href={ `/work?tech=${ item.slug }` } aria-label={ item.name }
                                          className={ iconInteractiveClasses }>
                                        <TechIcon icon={ item.icon }/>
                                    </Link>
                                ) : (
                                    <span role="img" aria-label={ item.name }
                                          className={ cn(iconInteractiveClasses, "cursor-default") }>
                                        <TechIcon icon={ item.icon }/>
                                    </span>
                                ) }
                            </Tooltip>
                        </li>
                    )) }
                </ul>
            </div>
        </section>
    );
}
