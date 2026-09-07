"use client";

import * as React from "react";
import type { PrinciplesContent } from "@portfolio/backend";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { useTranslation } from "@/shared/i18n";
import { IconRefPreview } from "@/shared/ui/icon-picker";

export interface PrinciplesProps {
    principles: PrinciplesContent;
}

export function Principles({ principles }: PrinciplesProps) {
    const { ln, pick } = useTranslation();

    return (
        <section
            className="max-w-(--layout-content-max-width) mx-auto px-(--layout-section-horizontal-padding) pb-[clamp(64px,8vw,96px)]">
            <Eyebrow className="mb-md">{ ln("eyebrow.howIWork") }</Eyebrow>
            <div className="grid gap-md" style={ { gridTemplateColumns: "repeat(auto-fit, minmax(min(15rem, 100%), 1fr))" } }>
                { principles.map((principle) => (
                    <Card key={ pick(principle.title) } className="p-lg">
                        <IconRefPreview icon={ principle.icon } className="h-xl aspect-square w-auto mb-md"/>
                        <Text as="h3" variant="h3" className="mb-xs">
                            { pick(principle.title) }
                        </Text>
                        <Text variant="caption" tone="muted" className="leading-relaxed">
                            { pick(principle.description) }
                        </Text>
                    </Card>
                )) }
            </div>
        </section>
    );
}
