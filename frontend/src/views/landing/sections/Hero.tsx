"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { HeroContent, LocalizedText, WorkSummary } from "@portfolio/backend";
import { Text } from "@/shared/ui/text";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LinkButton } from "@/shared/ui/button";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";

/**
 * `ssr:false` isn't optional here — WebGL/canvas/`requestAnimationFrame`
 * don't exist on the server, and even if they did, this decorative graph
 * must never delay the headline/CTA (the actual LCP content) becoming
 * interactive while its own JS loads. See `shared/ui/project-graph/README.md`.
 */
const ProjectGraphLazy = dynamic(() => import("@/shared/ui/project-graph").then((mod) => mod.ProjectGraph), {ssr: false});

export interface HeroProps {
    hero: HeroContent;
    /** Just `config.role`, not the whole `ConfigContent` — this is the only piece of site config the hero section actually renders (Interface Segregation over threading the full object down for one field). */
    role: LocalizedText;
    /** Same array `SelectedWork` renders below this section — reused here to drive the decorative project graph, not a second fetch of the same data. */
    items: WorkSummary[];
}

export function Hero({hero, role, items}: HeroProps) {
    const {ln, pick} = useTranslation();

    return (
        <section
            id="top"
            className={ cn(
                "relative overflow-hidden",
                "max-w-(--layout-content-max-width) mx-auto",
                "px-[clamp(20px,4vw,56px)] pt-[clamp(48px,7vw,96px)] pb-[clamp(64px,8vw,96px)]",
                "flex items-center gap-8",
            ) }
        >
            <div className="relative max-w-(--layout-content-reading)">
                <Eyebrow tone="accent" className="mb-4.5">
                    { pick(role) }
                </Eyebrow>

                <h1 className="m-0 mb-5.5 font-extrabold text-[clamp(40px,5.5vw,64px)] leading-[1.02] tracking-tight text-text-primary">
                    { hero.headline.map((line, index) => (
                        <React.Fragment key={ line }>
                            { index > 0 && <br/> }
                            { line }
                        </React.Fragment>
                    )) }
                </h1>

                <Text as="p" variant="body-lg" tone="secondary" className="mb-7.5 max-w-[46ch]">
                    { pick(hero.subhead) }
                </Text>

                <div className="flex flex-wrap gap-3.5">
                    <LinkButton href="#contact" variant="primary">
                        { ln("button.getInTouch") }
                    </LinkButton>
                    <LinkButton href="#journal" variant="secondary">
                        { ln("button.readJournal") }
                    </LinkButton>
                </div>
            </div>

            {/* Hidden below `lg` — WebGL squeezed into a narrow column isn't worth the extra JS on mobile, and the text above already carries the full message on its own. */ }
            <ProjectGraphLazy items={ items } className="hidden lg:block flex-1 h-(--layout-hero-graph-height)"/>
        </section>
    );
}
