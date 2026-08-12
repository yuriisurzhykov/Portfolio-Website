"use client";

import * as React from "react";
import type { HeroContent, LocalizedText } from "@portfolio/backend";
import { Text } from "@/shared/ui/text";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { Tag } from "@/shared/ui/tag";
import { LinkButton } from "@/shared/ui/button";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";

export interface HeroProps {
    hero: HeroContent;
    /** Just `config.role`, not the whole `ConfigContent` — this is the only piece of site config the hero section actually renders (Interface Segregation over threading the full object down for one field). */
    role: LocalizedText;
}

export function Hero({hero, role}: HeroProps) {
    const {ln, pick} = useTranslation();

    return (
        <section
            id="top"
            className={ cn(
                "relative overflow-hidden",
                "max-w-(--layout-content-max-width) mx-auto",
                "px-[clamp(20px,4vw,56px)] pt-[clamp(48px,7vw,96px)] pb-[clamp(64px,8vw,96px)]",
            ) }
        >
            <div
                aria-hidden
                className="absolute -top-35 -right-30 w-115 h-115 rounded-full pointer-events-none"
                style={ {
                    background: "var(--color-accent-glow)",
                    filter: "blur(var(--blur-aurora-strong))",
                    opacity: "var(--color-accent-glow-opacity)",
                } }
            />

            <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
                <div>
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

                <div className="relative h-85 hidden lg:block" aria-hidden>
                    { hero.graphNodes.map((node, index) => (
                        <div
                            key={ node.label }
                            className={ cn(
                                "absolute w-52.5 rounded-md px-4 py-3.5",
                                "bg-surface-raised border-[1.5px]",
                                node.highlighted ? "border-accent-solid" : "border-border-strong",
                                "font-mono font-semibold text-caption text-text-primary",
                            ) }
                            style={
                                [
                                    {top: 0, left: 20},
                                    {top: 110, left: 80},
                                    {top: 220, left: 30},
                                ][index]
                            }
                        >
                            { node.label }
                            <br/>
                            <span className="font-mono font-normal text-[10.5px] text-text-muted">
                                { pick(node.sublabel) }
                            </span>
                        </div>
                    )) }
                    <div className="absolute top-15 left-31.5 w-0.5 h-14 bg-border-connector"/>
                    <div className="absolute top-42.5 left-33.75 w-0.5 h-14 bg-border-connector"/>
                </div>
            </div>
        </section>
    );
}
