"use client";

import * as React from "react";
import Link from "next/link";
import type { PostSummary, WorkDetail } from "@portfolio/backend";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { Text } from "@/shared/ui/text";
import { Tag } from "@/shared/ui/tag";
import { StatusBadge } from "@/shared/ui/status-badge";
import { PlaceholderCover } from "@/shared/ui/placeholder-cover";
import { LinkButton } from "@/shared/ui/button";
import { ContentBlocks } from "@/shared/ui/content-blocks";
import { useTranslation } from "@/shared/i18n";

export interface WorkDetailPageProps {
    /** `caseStudy` is guaranteed non-null here — the route (app/(site)/work/[slug]/page.tsx) already 404s otherwise. */
    item: WorkDetail;
    relatedPost: PostSummary | null;
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
export function WorkDetailPage({ item, relatedPost }: WorkDetailPageProps) {
    const { ln, pick } = useTranslation();
    const caseStudy = item.caseStudy!;
    const isShipped = item.status === "shipped";

    return (
        <main>
            <div
                className="max-w-(--layout-content-reading) mx-auto px-[clamp(20px,4vw,24px)] pt-[clamp(48px,7vw,80px)] pb-[100px]">
                <Link href="/work" className="font-mono text-caption text-text-muted">
                    ← { ln("button.backToWork") }
                </Link>

                <div className="flex justify-between items-end gap-md mt-7 mb-6 flex-wrap">
                    <div>
                        <Eyebrow tone="accent" className="mb-3.5">
                            { ln("eyebrow.caseStudy") }
                        </Eyebrow>
                        <h1 className="m-0 font-extrabold text-[clamp(32px,4.5vw,48px)] leading-[1.1] tracking-tight text-text-primary">
                            { item.title }
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

                <PlaceholderCover
                    className="h-[280px] rounded-xl border border-border-subtle mb-10"
                    label={ `${ item.title.toLowerCase() } — hero screenshot` }
                    src={ caseStudy.heroImage ?? undefined }
                    alt={ item.title }
                />

                <ContentBlocks blocks={ caseStudy.blocks }/>

                <Text as="h2" variant="h2" className="mb-3.5">
                    { ln("work.caseStudy.stackHeading") }
                </Text>
                <div className="flex flex-wrap gap-2.5 mb-10">
                    { item.stack.map((tech) => (
                        <Tag key={ tech } variant="neutral" size="md">
                            { tech }
                        </Tag>
                    )) }
                </div>

                { relatedPost && (
                    <div
                        className="bg-surface-base border border-border-subtle rounded-xl p-6 flex justify-between items-center gap-md flex-wrap">
                        <div>
                            <Eyebrow className="mb-1.5">{ ln("eyebrow.relatedJournalEntry") }</Eyebrow>
                            <Text as="div" variant="h3" className="text-[17px]!">
                                { pick(relatedPost.title) }
                            </Text>
                            <Text as="div" variant="caption" tone="muted">
                                { pick(relatedPost.excerpt) }
                            </Text>
                        </div>
                        <LinkButton href={ `/journal/${ relatedPost.slug }` } variant="primary">
                            { ln("button.readThePost") } →
                        </LinkButton>
                    </div>
                ) }
            </div>
        </main>
    );
}
