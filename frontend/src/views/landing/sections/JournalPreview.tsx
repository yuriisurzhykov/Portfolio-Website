"use client";

import * as React from "react";
import Link from "next/link";
import type { PostSummary } from "@portfolio/backend";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { Text } from "@/shared/ui/text";
import { StatusBadge } from "@/shared/ui/status-badge";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import { CoverImage } from "@/shared/ui/cover-image";

export interface JournalPreviewProps {
    post: PostSummary | null;
}

export function JournalPreview({ post }: JournalPreviewProps) {
    const { ln, pick } = useTranslation();

    if (!post) return null;

    return (
        <section
            id="journal"
            className="max-w-(--layout-content-max-width) mx-auto px-[clamp(20px,4vw,56px)] pb-[clamp(64px,8vw,96px)] scroll-mt-20"
        >
            <Eyebrow className="mb-5">{ln("eyebrow.fromJournal")}</Eyebrow>
            <Link
                href={`/journal/${post.slug}`}
                className="group relative block p-8 pl-11 bg-surface-base border border-border-subtle rounded-xl hover:border-border-default transition-colors duration-normal"
            >
                <span
                    aria-hidden
                    className={cn(
                        "absolute left-4 top-3.5 bottom-3.5 w-0.75 rounded-pill bg-accent-solid origin-top",
                        "scale-y-0 transition-transform duration-slow ease-entrance motion-reduce:transition-none",
                        "group-hover:scale-y-100 group-focus-visible:scale-y-100",
                    )}
                />
                <div className="flex gap-lg items-start">
                    <div className="min-w-0 flex-1">
                        <div className="flex gap-sm items-center mb-3.5 flex-wrap">
                            <StatusBadge tone="accent">{pick(post.category)}</StatusBadge>
                            <Text variant="caption" tone="faint" className="font-mono normal-case">
                                {ln("journal.readMins", { count: post.readMins })}
                            </Text>
                        </div>
                        <Text as="h3" variant="h3" className="mb-2.5">
                            {pick(post.title)}
                        </Text>
                        <Text variant="body" tone="muted" className="max-w-[70ch] leading-[1.6]">
                            {pick(post.excerpt)}
                        </Text>
                    </div>
                    {post.cover && (
                        <CoverImage
                            {...post.cover}
                            fetchPriority="high"
                            loading="eager"
                            className="hidden md:block w-45 h-23.5 shrink-0 rounded-lg border border-border-subtle"
                        />
                    )}
                </div>
            </Link>
        </section>
    );
}
