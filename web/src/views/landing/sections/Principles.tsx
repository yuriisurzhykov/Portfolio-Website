"use client";

import * as React from "react";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { useTranslation } from "@/shared/i18n";
import { principles } from "@/data/principles";

export function Principles() {
    const { ln, pick } = useTranslation();

    return (
        <section className="max-w-[var(--layout-content-max-width)] mx-auto px-[clamp(20px,4vw,56px)] pb-[clamp(64px,8vw,96px)]">
            <Eyebrow className="mb-[20px]">{ln("eyebrow.howIWork")}</Eyebrow>
            <div className="grid gap-[20px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
                {principles.map((principle) => (
                    <Card key={pick(principle.title)} className="p-[28px]">
                        <div className="w-[34px] h-[34px] rounded-md bg-surface-icon mb-[16px]" />
                        <Text as="h3" variant="h3" className="mb-[10px]">
                            {pick(principle.title)}
                        </Text>
                        <Text variant="caption" tone="muted" className="leading-[1.6]">
                            {pick(principle.description)}
                        </Text>
                    </Card>
                ))}
            </div>
        </section>
    );
}
