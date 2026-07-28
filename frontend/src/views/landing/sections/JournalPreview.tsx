"use client";

import * as React from "react";
import Link from "next/link";
import type { PostSummary } from "@portfolio/backend";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { Text } from "@/shared/ui/text";
import { StatusBadge } from "@/shared/ui/status-badge";
import { useTranslation } from "@/shared/i18n";

export interface JournalPreviewProps {
    post: PostSummary | null;
}

export function JournalPreview({ post }: JournalPreviewProps) {
    const { ln, pick } = useTranslation();

    if (!post) return null;

    return (
        <section
            id="journal"
            className="max-w-[var(--layout-content-max-width)] mx-auto px-[clamp(20px,4vw,56px)] pb-[clamp(64px,8vw,96px)] scroll-mt-20"
        >
            <Eyebrow className="mb-[20px]">{ln("eyebrow.fromJournal")}</Eyebrow>
            <Link
                href={`/journal/${post.slug}`}
                className="block p-[32px] bg-surface-base border border-border-subtle rounded-xl hover:border-border-default transition-colors duration-normal"
            >
                <div className="flex gap-sm items-center mb-[14px] flex-wrap">
                    <StatusBadge tone="accent">{pick(post.category)}</StatusBadge>
                    <Text variant="caption" tone="faint" className="font-mono normal-case">
                        {ln("journal.readMins", { count: post.readMins })}
                    </Text>
                </div>
                <Text as="h3" variant="h3" className="mb-[10px]">
                    {pick(post.title)}
                </Text>
                <Text variant="body" tone="muted" className="max-w-[70ch] leading-[1.6]">
                    {pick(post.excerpt)}
                </Text>
            </Link>
        </section>
    );
}
