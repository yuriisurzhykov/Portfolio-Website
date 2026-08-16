"use client";

import * as React from "react";
import Link from "next/link";
import type { WorkPageContent, WorkSummary } from "@portfolio/backend";
import { Text } from "@/shared/ui/text";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Tag } from "@/shared/ui/tag";
import { TagList } from "@/shared/ui/tag-list";
import { WorkCoverImage } from "@/shared/ui/work-cover-image";
import { CompactRelatedLink } from "@/shared/ui/related-content-callout";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import { formatYear } from "@/shared/lib/date-format";

export interface ActiveTechFilter {
    slug: string;
    /** As-typed spelling from a matching item's `stack` (e.g. "Jetpack Compose"), not the URL slug — see `findTechDisplayName` (backend). */
    label: string;
}

export interface WorkListPageProps {
    items: WorkSummary[];
    workPage: WorkPageContent;
    /** Non-null when the page was reached via `/work?tech=...` — drives the active-filter chip and the empty state below. */
    activeTech: ActiveTechFilter | null;
}

const desktopRowGridCols = "sm:grid-cols-[3.5rem_4.5rem_1fr_auto_auto]";

/**
 * `caseStudyHref`/`relatedPostHref` are mutually exclusive by construction
 * (an item either has its own case study or it doesn't — see
 * `WorkSummary.hasCaseStudy`), which is exactly why only ONE of the two
 * ever wraps the whole row in a `<Link>` below: nesting a second anchor
 * (or `CompactRelatedLink`) inside the row's own would be invalid HTML.
 * When it's a related-POST fallback (no case study of its own), the row
 * stays a plain, non-link container and `CompactRelatedLink` becomes the
 * ONE real link on it — replacing what used to be the entire row silently
 * linking to `/journal/:slug` with nothing but a bare "→" to show for it.
 */
function WorkRow({ item }: { item: WorkSummary }) {
    const { ln, pick } = useTranslation();
    const isShipped = item.status === "shipped";
    const caseStudyHref = item.hasCaseStudy ? `/work/${ item.slug }` : null;
    const relatedPostHref = !item.hasCaseStudy && item.relatedPostSlug ? `/journal/${ item.relatedPostSlug }` : null;

    const statusBadge = (
        <StatusBadge tone={ isShipped ? "success" : "warning" } className="whitespace-nowrap">
            { ln(isShipped ? "status.shipped" : "status.inProgress") }
        </StatusBadge>
    );

    const trailingIndicator = caseStudyHref
        ? <span className="text-text-muted">→</span>
        : relatedPostHref
            ? <CompactRelatedLink href={ relatedPostHref } label={ ln("work.ledger.relatedPost") }/>
            : null;

    const thumbnail = (
        <WorkCoverImage
            override={ item.coverImage }
            cover={ item.cover }
            alt={ pick(item.title) }
            label={ pick(item.title).toLowerCase() }
            className="h-10 w-14 rounded-md border border-border-subtle shrink-0"
        />
    );

    const wrapperClass = cn(
        "block border-b border-border-subtle",
        caseStudyHref && "hover:bg-surface-row-hover transition-colors duration-fast rounded-lg",
    );

    const body = (
        <>
            {/* Mobile: stacked card */ }
            <div className="sm:hidden py-md px-md">
                <div className="flex items-center gap-sm mb-xs">
                    { thumbnail }
                    <div className="flex-1 flex items-center justify-between gap-sm">
                        <span className="font-mono text-caption text-text-faint">{ formatYear(item.date) }</span>
                        <div className="flex items-center gap-xs">
                            { statusBadge }
                            { trailingIndicator }
                        </div>
                    </div>
                </div>
                <Text as="div" variant="h3" className="mb-1">
                    { pick(item.title) }
                </Text>
                <Text as="div" variant="body" tone="muted" className="leading-normal">
                    { pick(item.summary) }
                </Text>
            </div>

            {/* sm and up: ledger row */ }
            <div className={ cn("hidden sm:grid items-center gap-md py-xl px-md", desktopRowGridCols) }>
                { thumbnail }
                <span className="font-mono text-caption text-text-faint">{ formatYear(item.date) }</span>
                <div>
                    <Text as="div" variant="h3" className="mb-1">
                        { pick(item.title) }
                    </Text>
                    <Text as="div" variant="body" tone="muted" className="leading-normal">
                        { pick(item.summary) }
                    </Text>
                </div>
                <TagList items={ item.stack } maxVisible={ 2 } size="sm" variant="neutral" className="self-center"/>
                <div className="flex items-center gap-sm self-center">
                    { statusBadge }
                    { trailingIndicator }
                </div>
            </div>
        </>
    );

    if (caseStudyHref) {
        return (
            <Link href={ caseStudyHref } className={ wrapperClass }>
                { body }
            </Link>
        );
    }

    return <div className={ wrapperClass }>{ body }</div>;
}

export function WorkListPage({ items, workPage, activeTech }: WorkListPageProps) {
    const { ln, pick } = useTranslation();

    return (
        <main>
            {/* pb-10 already exact match (2xl). m-2 already exact match (xs). */ }
            <div
                className="max-w-(--layout-content-standard) mx-auto pt-xl pb-2xl">
                <Link href="/" className="font-bold text-caption text-text-accent">
                    ← { ln("button.backHome") }
                </Link>
                <Text variant={ "h2" } className="m-xs">
                    { pick(workPage.heading) }
                </Text>
                <Text variant="body" tone="muted" className="m-xs">
                    { pick(workPage.description) }
                </Text>

                {/* mt-5 (20px) tie md/lg, smaller preferred. */ }
                { activeTech && (
                    <div className="flex items-center gap-sm mt-md" role="status">
                        <Text variant="caption" tone="faint" className="font-mono">
                            { ln("work.filter.activeLabel") }
                        </Text>
                        <Tag variant="accent">{ activeTech.label }</Tag>
                        <Link
                            href="/work"
                            className="font-mono text-caption text-text-muted hover:text-text-primary transition-colors duration-fast"
                        >
                            { ln("work.filter.clear") }
                        </Link>
                    </div>
                ) }
            </div>

            {/* pt-6/py-16 already exact matches (lg/4xl). */ }
            <div className="max-w-(--layout-content-standard) mx-auto pt-lg pb-4xl">
                { items.length === 0 && activeTech ? (
                    <Text variant="body" tone="muted" className="py-4xl text-center">
                        { ln("work.filter.empty", { tech: activeTech.label }) }
                    </Text>
                ) : (
                    <>
                        {/* gap-4/pb-3 already exact matches (md/sm). px-5
                            (20px) tie md/lg, smaller preferred. tracking-
                            [0.08em] snapped to tracking-widest (0.1em,
                            nearer than wider/0.05em) — same as elsewhere,
                            no letter-spacing token category exists. */ }
                        <div
                            className={ cn(
                                "hidden sm:grid gap-md px-md pb-sm",
                                desktopRowGridCols,
                                "font-mono font-semibold text-micro tracking-widest text-text-faint",
                                "border-b border-border-subtle",
                            ) }
                        >
                            <span aria-hidden="true"/>
                            <span>{ ln("work.ledger.year") }</span>
                            <span>{ ln("work.ledger.system") }</span>
                            <span>{ ln("work.ledger.stack") }</span>
                            <span className="text-right">{ ln("work.ledger.status") }</span>
                        </div>

                        { items.map((item) => (
                            <WorkRow key={ item.slug } item={ item }/>
                        )) }
                    </>
                ) }
            </div>
        </main>
    );
}
