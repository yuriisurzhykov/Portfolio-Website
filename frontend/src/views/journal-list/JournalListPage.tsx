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
                    "absolute left-0 top-xl h-sm aspect-square w-auto rounded-full",
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
                    {/* Dropped the `text-[21px]!` override (only 1px from
                        h3's real 20px) — real h3 instead. mb-1.5 (6px) tie
                        xxs/xs, smaller preferred. */ }
                    <Text as="div" variant="h3" tone={ isPublished ? "primary" : "muted" }
                          className="mb-xxs">
                        { pick(post.title) }
                    </Text>
                    <Text as="div" variant="caption" tone={ isPublished ? "muted" : "faint" }
                          className="max-w-[60ch] leading-relaxed">
                        { pick(post.excerpt) }
                    </Text>
                </div>
                { isPublished && post.cover && (
                    // Hidden below `sm` — a thumbnail this small adds
                    // nothing on a narrow viewport but does cost layout
                    // width the wrapping text badly needs there instead.
                    <CoverImage
                        { ...post.cover }
                        className="hidden sm:block w-30 h-15.75 shrink-0 rounded-md border border-border-subtle"
                    />
                ) }
            </div>
        </>
    );

    // py-6 already exact match (lg). pl-[34px] has no exact step (between
    // xl/32 and 2xl/40) — snapped to xl (nearer).
    if (isPublished) {
        return (
            <Link href={ `/journal/${ post.slug }` } className="relative block py-lg pl-xl">
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
        <div className="relative block py-lg pl-xl">
            { inner }
        </div>
    );
}

export function JournalListPage({ entries, journalPage }: JournalListPageProps) {
    const { ln, pick } = useTranslation();

    return (
        <main>
            {/* pb-10/m-2 already exact matches (2xl/xs). */ }
            <div
                className="max-w-(--layout-content-standard) mx-auto pt-xl pb-2xl">
                <Link href="/" className="text-caption text-text-accent font-bold">
                    ← { ln("button.backHome") }
                </Link>
                <Text variant={ "h2" } className="m-xs">
                    { pick(journalPage.heading) }
                </Text>
                <Text variant="body" tone="muted" className="m-xs">
                    { pick(journalPage.description) }
                </Text>
            </div>

            {/* pt-2 already exact match (xs). bottom-25 (100px) is closer to
                6xl (96) than anything else. w-0.5 (2px) left as-is, same
                too-small-to-snap reasoning as elsewhere. */ }
            <div
                className="relative max-w-(--layout-content-standard) mx-auto px-(--layout-reading-horizontal-padding) pt-xs pb-md">
                <div
                    className="absolute left-[calc(var(--layout-reading-horizontal-padding)+5px)] top-xs bottom-6xl w-0.5 bg-border-subtle"/>
                { entries.map((post) => (
                    <LogEntry key={ post.slug } post={ post }/>
                )) }
            </div>
        </main>
    );
}
