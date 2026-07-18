import * as React from "react";
import { Text } from "@/shared/ui/text";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { Tag } from "@/shared/ui/tag";
import { LinkButton } from "@/shared/ui/button";
import { useTranslation } from "@/shared/i18n";
import { site } from "@/data/config";
import { hero } from "@/data/hero";
import { cn } from "@/shared/lib/utils";

export function Hero() {
    const {ln, pick} = useTranslation();

    return (
        <section
            id="top"
            className={ cn(
                "relative overflow-hidden",
                "max-w-[var(--layout-content-max-width)] mx-auto",
                "px-[clamp(20px,4vw,56px)] pt-[clamp(48px,7vw,96px)] pb-[clamp(64px,8vw,96px)]",
            ) }
        >
            <div
                aria-hidden
                className="absolute -top-[140px] -right-[120px] w-[460px] h-[460px] rounded-full pointer-events-none"
                style={ {
                    background: "var(--color-accent-glow)",
                    filter: "blur(var(--blur-aurora-strong))",
                    opacity: "var(--color-accent-glow-opacity)",
                } }
            />

            <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-[48px] items-center">
                <div>
                    <Eyebrow tone="accent" className="mb-[18px]">
                        { pick(site.role) }
                    </Eyebrow>

                    <h1 className="m-0 mb-[22px] font-extrabold text-[clamp(40px,5.5vw,64px)] leading-[1.02] tracking-tight text-text-primary">
                        { hero.headline.map((line, index) => (
                            <React.Fragment key={ line }>
                                { index > 0 && <br/> }
                                { line }
                            </React.Fragment>
                        )) }
                    </h1>

                    <Text as="p" variant="body-lg" tone="secondary" className="mb-[30px] max-w-[46ch]">
                        { pick(hero.subhead) }
                    </Text>

                    <div className="flex flex-wrap gap-[10px] mb-[36px]">
                        { pick(hero.chips).map((chip) => (
                            <Tag key={ chip } variant="outline">
                                { chip }
                            </Tag>
                        )) }
                    </div>

                    <div className="flex flex-wrap gap-[14px]">
                        <LinkButton href="#work" variant="primary">
                            { ln("button.viewArchitecture") }
                        </LinkButton>
                        <LinkButton href="#journal" variant="secondary">
                            { ln("button.readJournal") }
                        </LinkButton>
                    </div>
                </div>

                <div className="relative h-[340px] hidden lg:block" aria-hidden>
                    { hero.graphNodes.map((node, index) => (
                        <div
                            key={ node.label }
                            className={ cn(
                                "absolute w-[210px] rounded-md px-[16px] py-[14px]",
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
                    <div className="absolute top-[60px] left-[126px] w-[2px] h-[56px] bg-border-connector"/>
                    <div className="absolute top-[170px] left-[135px] w-[2px] h-[56px] bg-border-connector"/>
                </div>
            </div>
        </section>
    );
}
