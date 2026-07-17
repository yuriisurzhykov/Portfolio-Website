import * as React from "react";
import { Link } from "react-router-dom";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { Text } from "@/shared/ui/text";
import { StatusBadge } from "@/shared/ui/status-badge";
import { useTranslation } from "@/shared/i18n";
import { journal } from "@/data/journal";

export function JournalPreview() {
    const { ln } = useTranslation();
    const latest = journal.find((post) => post.status === "published");

    if (!latest) return null;

    return (
        <section
            id="journal"
            className="max-w-[var(--layout-content-max-width)] mx-auto px-[clamp(20px,4vw,56px)] pb-[clamp(64px,8vw,96px)] scroll-mt-20"
        >
            <Eyebrow className="mb-[20px]">{ln("eyebrow.fromJournal")}</Eyebrow>
            <Link
                to={`/journal/${latest.slug}`}
                className="block p-[32px] bg-surface-base border border-border-subtle rounded-xl hover:border-border-default transition-colors duration-normal"
            >
                <div className="flex gap-sm items-center mb-[14px] flex-wrap">
                    <StatusBadge tone="accent">{latest.category}</StatusBadge>
                    <Text variant="caption" tone="faint" className="font-mono normal-case">
                        {ln("journal.readMins", { count: latest.readMins })}
                    </Text>
                </div>
                <Text as="h3" variant="h3" className="mb-[10px]">
                    {latest.title}
                </Text>
                <Text variant="body" tone="muted" className="max-w-[70ch] leading-[1.6]">
                    {latest.excerpt}
                </Text>
            </Link>
        </section>
    );
}
