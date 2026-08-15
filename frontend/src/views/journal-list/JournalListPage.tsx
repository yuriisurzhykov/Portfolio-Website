"use client";

import * as React from "react";
import Link from "next/link";
import type { JournalPageContent, PostSummary } from "@portfolio/backend";
import { Text } from "@/shared/ui/text";
import { StatusBadge } from "@/shared/ui/status-badge";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import { formatMonthYear } from "@/shared/lib/date-format";
import { CoverImage } from "@/shared/ui/cover-image";

export interface JournalListPageProps {
    entries: PostSummary[];
    journalPage: JournalPageContent;
}

function LogEntry({ post }: { post: PostSummary }) {
    const { ln, pick } = useTranslation();
    const isPublished = post.status === "published";

    const inner = (
        <>
            <div
                className={ cn(
                    "absolute left-0 top-[29px] w-3 h-3 rounded-full",
                    isPublished ? "bg-accent-solid" : "bg-text-faint",
                ) }
            />
            <div className="flex gap-lg items-start">
                <div className="min-w-0 flex-1">
                    <div className="flex gap-sm items-baseline mb-2 flex-wrap">
                        <Text variant="caption" tone="faint" className="font-mono">
                            { isPublished ? formatMonthYear(post.date) : ln("status.upcoming", { date: formatMonthYear(post.date) }) }
                        </Text>
                        { isPublished && <StatusBadge tone="accent">{ pick(post.category) }</StatusBadge> }
                        { isPublished && (
                            <Text variant="caption" tone="faint" className="font-mono">
                                { ln("journal.readMins", { count: post.readMins }) }
                            </Text>
                        ) }
                    </div>
                    <Text as="div" variant="h3" tone={ isPublished ? "primary" : "muted" }
                          className="mb-1.5 text-[21px]!">
                        { pick(post.title) }
                    </Text>
                    <Text as="div" variant="caption" tone={ isPublished ? "muted" : "faint" }
                          className="max-w-[60ch] leading-[1.6]">
                        { pick(post.excerpt) }
                    </Text>
                </div>
                { isPublished && post.cover && (
                    // Hidden below `sm` — a thumbnail this small adds
                    // nothing on a narrow viewport but does cost layout
                    // width the wrapping text badly needs there instead.
                    <CoverImage
                        { ...post.cover }
                        className="hidden sm:block w-[120px] h-[63px] shrink-0 rounded-md border border-border-subtle"
                    />
                ) }
            </div>
        </>
    );

    if (isPublished) {
        return (
            <Link href={ `/journal/${ post.slug }` } className="relative block py-6 pl-[34px]">
                { inner }
            </Link>
        );
    }

    // De-emphasized via the muted/faint text tones above (already WCAG AA-compliant on their
    // own), not via `opacity` — applying opacity to the whole block would uniformly fade these
    // already-borderline colors toward the background and fail contrast again (see
    // README.md, section 11: to stay compliant, the opacity would need to go from
    // 0.45 to ~0.9, which defeats the purpose of dimming it at all).
    return (
        <div className="relative block py-6 pl-[34px]">
            { inner }
        </div>
    );
}

export function JournalListPage({ entries, journalPage }: JournalListPageProps) {
    const { ln, pick } = useTranslation();

    return (
        <main>
            <div
                className="max-w-(--layout-content-standard) mx-auto pt-xl pb-10">
                <Link href="/" className="text-caption text-text-accent font-bold">
                    ← { ln("button.backHome") }
                </Link>
                <Text variant={ "h2" } className="m-2">
                    { pick(journalPage.heading) }
                </Text>
                <Text variant="body" tone="muted" className="m-2">
                    { pick(journalPage.description) }
                </Text>
            </div>

            <div
                className="relative max-w-(--layout-content-standard) mx-auto px-[clamp(20px,4vw,24px)] pt-2 pb-md">
                <div
                    className="absolute left-[calc(clamp(20px,4vw,24px)+5px)] top-2 bottom-25 w-0.5 bg-border-subtle"/>
                { entries.map((post) => (
                    <LogEntry key={ post.slug } post={ post }/>
                )) }
            </div>
        </main>
    );
}
