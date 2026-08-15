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
            className="max-w-(--layout-content-max-width) mx-auto px-(--layout-section-horizontal-padding) pb-[clamp(80px,9vw,120px)] scroll-mt-20"
        >
            <div className="text-center rounded-2xl bg-surface-base border border-border-subtle p-[clamp(40px,6vw,64px)]">
                <Text as="h2" variant="h2" className="m-0 mb-4">
                    {pick(contact.heading)}
                </Text>
                <Text variant="body" tone="muted" className="mb-7 max-w-[60ch] mx-auto">
                    {pick(contact.description)}
                </Text>
                <LinkButton href={`mailto:${email}`} variant="primary" size="lg">
                    {ln("button.getInTouch")}
                </LinkButton>
            </div>
        </section>
    );
}
