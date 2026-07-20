"use client";

import * as React from "react";
import type { ContactContent } from "@portfolio/backend";
import { Text } from "@/shared/ui/text";
import { LinkButton } from "@/shared/ui/button";
import { useTranslation } from "@/shared/i18n";

export interface ContactCtaProps {
    contact: ContactContent;
    /** Just `config.email`, not the whole `ConfigContent` — same Interface Segregation reasoning as `Hero`'s `role` prop. */
    email: string;
}

export function ContactCta({ contact, email }: ContactCtaProps) {
    const { ln, pick } = useTranslation();

    return (
        <section
            id="contact"
            className="max-w-[var(--layout-content-max-width)] mx-auto px-[clamp(20px,4vw,56px)] pb-[clamp(80px,9vw,120px)] scroll-mt-20"
        >
            <div className="relative overflow-hidden text-center rounded-2xl bg-surface-base border border-border-subtle p-[clamp(40px,6vw,64px)]">
                <div
                    aria-hidden
                    className="absolute -bottom-[100px] -left-[80px] w-[300px] h-[300px] rounded-full opacity-25 pointer-events-none"
                    style={{
                        background: "radial-gradient(circle, var(--color-accent-solid) 0%, transparent 70%)",
                        filter: "blur(var(--blur-aurora-soft))",
                    }}
                />
                <h2 className="relative m-0 mb-[16px] font-extrabold text-[clamp(28px,3.5vw,40px)] leading-[1.15] text-text-primary">
                    {pick(contact.heading)}
                </h2>
                <Text variant="body" tone="muted" className="relative mb-[28px] max-w-[60ch] mx-auto">
                    {pick(contact.description)}
                </Text>
                <LinkButton href={`mailto:${email}`} variant="primary" size="lg" className="relative">
                    {ln("button.getInTouch")}
                </LinkButton>
            </div>
        </section>
    );
}
