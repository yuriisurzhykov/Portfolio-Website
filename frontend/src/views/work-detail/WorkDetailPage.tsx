"use client";

import * as React from "react";
import Link from "next/link";
import type { PostSummary, WorkDetail } from "@portfolio/backend";
import { Text } from "@/shared/ui/text";
import { StatusBadge } from "@/shared/ui/status-badge";
import { WorkCoverImage } from "@/shared/ui/work-cover-image";
import { TagList } from "@/shared/ui/tag-list";
import { RelatedContentCallout } from "@/shared/ui/related-content-callout";
import { ContentBlocks } from "@/shared/ui/content-blocks";
import { useTranslation } from "@/shared/i18n";
import { accentColorForHue } from "@/shared/lib/hue-accent";

export interface WorkDetailPageProps {
    /** `caseStudy` is guaranteed non-null here — the route (app/(site)/work/[slug]/page.tsx) already 404s otherwise. */
    item: WorkDetail;
    relatedPost: PostSummary | null;
    /**
     * This project's own resolved hue (`resolveWorkHue`, backend) —
     * resolved server-side by the route, not here: a client component
     * importing anything from `@portfolio/backend` beyond plain data types
     * would risk pulling backend-only code into the browser bundle. Drives
     * the ONE hue accent this page shows (the "Case study" eyebrow) — see
     * the plan's decision that hue accents only ever appear on detail
     * pages, never on list/card views (the cover thumbnail already carries
     * the color signal there).
     */
    hue: number;
    /** Same reasoning as `JournalDetailPage.isPreview` — see its comment. */
    isPreview?: boolean;
}

/**
 * The case-study narrative renders through the exact same <ContentBlocks>
 * as a journal post body (`item.caseStudy.blocks`) — Phase 1/2 had this
 * hand-rolled here (`caseStudy.sections.map(...)`, a separate
 * `caseStudy.approach.map(...)`), duplicating logic that already existed
 * in ContentBlocks for the journal detail page. Now that both a post body
 * and a case study are the same Document/Block shape in the database
 * (see the migration plan), there's no reason for two renderers — the old
 * "sections" became heading+paragraph block pairs and "approach" became
 * an `approachList` block during the Phase 3 data import.
 */
export function WorkDetailPage({ item, relatedPost, hue, isPreview = false }: WorkDetailPageProps) {
    const { ln, pick } = useTranslation();
    const caseStudy = item.caseStudy!;
    const isShipped = item.status === "shipped";

    return (
        <main>
            {isPreview && (
                <div className="sticky top-0 z-50 bg-status-warning-tint-bg text-status-warning border-b border-border-subtle py-2 px-4 text-center text-caption font-medium">
                    Preview — showing unpublished draft content, not what's currently live.
                </div>
            )}
            <div
                className="max-w-(--layout-content-reading) mx-auto px-[clamp(20px,4vw,24px)] pt-[clamp(48px,7vw,80px)] pb-[100px]">
                <Link href="/work" className="font-mono text-caption text-text-muted">
                    ← { ln("button.backToWork") }
                </Link>

                <div className="flex justify-between items-end gap-md mt-7 mb-6 flex-wrap">
                    <div>
                        {/* Fill+ink, not colored text on the page bg — see frontend/README.md's dated a11y entry for why. */}
                        <StatusBadge tone="accent" className="mb-3.5" style={ { backgroundColor: accentColorForHue(hue) } }>
                            { ln("eyebrow.caseStudy") }
                        </StatusBadge>
                        <h1 className="m-0 font-extrabold text-[clamp(32px,4.5vw,48px)] leading-[1.1] tracking-tight text-text-primary">
                            { pick(item.title) }
                        </h1>
                    </div>
                    <StatusBadge tone={ isShipped ? "success" : "warning" } className="whitespace-nowrap h-fit">
                        { ln(isShipped ? "status.shipped" : "status.inProgress") }
                    </StatusBadge>
                </div>

                <div className="flex flex-wrap gap-6 mb-8 font-mono text-caption text-text-muted">
                    <span>{ ln("work.caseStudy.started", { date: pick(caseStudy.startedLabel) }) }</span>
                    <span>{ ln(isShipped ? "work.caseStudy.shipped" : "work.caseStudy.target", { date: pick(caseStudy.shippedLabel) }) }</span>
                    <span>{ ln("work.caseStudy.role", { role: pick(caseStudy.role) }) }</span>
                </div>

                <WorkCoverImage
                    className="h-[280px] rounded-xl border border-border-subtle mb-10"
                    override={ caseStudy.heroImage }
                    cover={ item.cover }
                    label={ `${ pick(item.title).toLowerCase() } — hero screenshot` }
                    alt={ pick(item.title) }
                    fetchPriority="high"
                    loading="eager"
                />

                <ContentBlocks blocks={ caseStudy.blocks }/>

                <Text as="h2" variant="h2" className="mb-3.5">
                    { ln("work.caseStudy.stackHeading") }
                </Text>
                <TagList items={ item.stack } size="md" variant="neutral" className="gap-2.5 mb-10" />

                { relatedPost && (
                    <RelatedContentCallout
                        eyebrow={ ln("eyebrow.relatedJournalEntry") }
                        title={ pick(relatedPost.title) }
                        body={ pick(relatedPost.excerpt) }
                        href={ `/journal/${ relatedPost.slug }` }
                        buttonLabel={ ln("button.readThePost") }
                    />
                ) }
            </div>
        </main>
    );
}
