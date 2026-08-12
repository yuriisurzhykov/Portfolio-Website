"use client";

import * as React from "react";
import Link from "next/link";
import type { WorkSummary } from "@portfolio/backend";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { StatusBadge } from "@/shared/ui/status-badge";
import { WorkCoverImage } from "@/shared/ui/work-cover-image";
import { TagList } from "@/shared/ui/tag-list";
import { useTranslation } from "@/shared/i18n";
import { LinkButton } from "@/shared/ui/button";

export interface SelectedWorkProps {
    items: WorkSummary[];
}

function WorkCard({item}: { item: WorkSummary }) {
    const {ln, pick} = useTranslation();
    const isShipped = item.status === "shipped";
    const detailHref = item.hasCaseStudy ? `/work/${ item.slug }` : item.relatedPostSlug ? `/journal/${ item.relatedPostSlug }` : undefined;
    const detailLabel = item.hasCaseStudy ? ln("button.caseStudy") : ln("button.readTheStory");

    return (
        <Card className="overflow-hidden p-0">
            <WorkCoverImage
                className="h-40"
                override={ item.coverImage }
                cover={ item.cover }
                label={ `${ pick(item.title).toLowerCase() } — cover image` }
                alt={ pick(item.title) }
            />
            <div className="p-6">
                <div className="flex justify-between items-center gap-sm mb-2.5">
                    <Text as="h3" variant="h3">
                        { pick(item.title) }
                    </Text>
                    <StatusBadge tone={ isShipped ? "success" : "warning" } className="whitespace-nowrap">
                        { ln(isShipped ? "status.shipped" : "status.inProgress") }
                    </StatusBadge>
                </div>
                <Text as="div" variant="caption" tone="muted" className="mb-4 leading-[1.6]">
                    { pick(item.summary) }
                </Text>
                <div className="flex justify-between items-center gap-sm flex-wrap">
                    <TagList items={ item.stack } maxVisible={ 3 } size="sm" variant="neutral"/>
                    { detailHref && (
                        <Link href={ detailHref } className="font-semibold text-caption whitespace-nowrap">
                            { detailLabel } →
                        </Link>
                    ) }
                </div>
            </div>
        </Card>
    );
}

export function SelectedWork({items}: SelectedWorkProps) {
    const {ln} = useTranslation();

    return (
        <section
            id="work"
            className="max-w-(--layout-content-max-width) mx-auto px-[clamp(20px,4vw,56px)] pb-[clamp(64px,8vw,96px)] scroll-mt-20"
        >
            <Text variant={ "h4" } className="mb-5 text-accent-text">{ ln("eyebrow.selectedWork") }</Text>
            <div className="grid gap-6" style={ {gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))"} }>
                { items.map((item) => (
                    <WorkCard key={ item.slug } item={ item }/>
                )) }
                <div className="col-span-full flex justify-center">
                    <LinkButton href={ "/work" } variant={ "secondary" }
                                className="">
                        { ln("button.viewAllWork") }
                    </LinkButton>
                </div>
            </div>
        </section>
    );
}
