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

function WorkCard({ item }: { item: WorkSummary }) {
    const { ln, pick } = useTranslation();
    const isShipped = item.status === "shipped";
    const detailHref = item.hasCaseStudy
        ? `/work/${ item.slug }`
        : item.relatedPostSlug
            ? `/journal/${ item.relatedPostSlug }`
            : undefined;
    const detailLabel = item.hasCaseStudy ? ln("button.caseStudy") : ln("button.readTheStory");

    const content = (
        <Card interactive={ Boolean(detailHref) } className="flex h-full flex-col overflow-hidden p-0">
            <WorkCoverImage
                className="h-40"
                override={ item.coverImage }
                cover={ item.cover }
                label={ `${ pick(item.title).toLowerCase() } — cover image` }
                alt={ pick(item.title) }
            />
            <div className="p-lg flex flex-col flex-1">
                <div className="flex justify-between items-center gap-sm mb-xs">
                    <Text as="h3" variant="h3">
                        { pick(item.title) }
                    </Text>
                    <StatusBadge tone={ isShipped ? "success" : "warning" } className="whitespace-nowrap">
                        { ln(isShipped ? "status.shipped" : "status.inProgress") }
                    </StatusBadge>
                </div>
                <Text as="div" variant="caption" tone="muted" className="mb-md flex-1">
                    { pick(item.summary) }
                </Text>
                <div className="flex justify-between items-center gap-sm flex-wrap">
                    <TagList items={ item.stack } maxVisible={ 3 } size="sm" variant="neutral"/>
                </div>
                { detailHref && (
                    <span className="mt-xs font-semibold align-bottom text-caption whitespace-nowrap text-accent-text">
                        { detailLabel } →
                    </span>
                ) }
            </div>
        </Card>
    );

    if (!detailHref) {
        return content;
    }

    return (
        <Link href={ detailHref } prefetch={ false }
              aria-label={ `${ pick(item.title) } — ${ detailLabel }` }>
            { content }
        </Link>
    );
}

export function SelectedWork({ items }: SelectedWorkProps) {
    const { ln } = useTranslation();

    return (
        <section
            id="work"
            className="max-w-(--layout-content-max-width) mx-auto px-(--layout-section-horizontal-padding) py-xs scroll-mt-20"
        >
            <Text variant={ "body-lg" }
                  className="mb-md text-accent-text font-bold">{ ln("eyebrow.selectedWork") }</Text>
            <div className="grid gap-lg" style={ { gridTemplateColumns: "repeat(auto-fit, minmax(min(18.75rem, 100%), 1fr))" } }>
                { items.map((item) => (
                    <WorkCard key={ item.slug } item={ item }/>
                )) }
            </div>
            <div className="py-md flex justify-center items-center">
                <LinkButton href={ "/work" } variant={ "secondary" }
                            className="">
                    { ln("button.viewAllWork") }
                </LinkButton>
            </div>
        </section>
    );
}
