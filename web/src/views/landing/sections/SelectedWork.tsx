"use client";

import * as React from "react";
import Link from "next/link";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { StatusBadge } from "@/shared/ui/status-badge";
import { PlaceholderCover } from "@/shared/ui/placeholder-cover";
import { useTranslation } from "@/shared/i18n";
import { work, type WorkItem } from "@/data/work";

function WorkCard({ item }: { item: WorkItem }) {
    const { ln, pick } = useTranslation();
    const isShipped = item.status === "shipped";
    const detailHref = item.caseStudy ? `/work/${item.slug}` : item.relatedPostSlug ? `/journal/${item.relatedPostSlug}` : undefined;
    const detailLabel = item.caseStudy ? ln("button.caseStudy") : ln("button.readTheStory");

    return (
        <Card className="overflow-hidden p-0">
            <PlaceholderCover className="h-[160px]" label={`${item.title.toLowerCase()} — cover image`} src={item.coverImage} alt={item.title} />
            <div className="p-[24px]">
                <div className="flex justify-between items-center gap-sm mb-[10px]">
                    <Text as="h3" variant="h3">
                        {item.title}
                    </Text>
                    <StatusBadge tone={isShipped ? "success" : "warning"} className="whitespace-nowrap">
                        {ln(isShipped ? "status.shipped" : "status.inProgress")}
                    </StatusBadge>
                </div>
                <Text as="div" variant="caption" tone="muted" className="mb-[16px] leading-[1.6]">
                    {pick(item.summary)}
                </Text>
                <div className="flex justify-between items-center gap-sm flex-wrap">
                    <div className="flex flex-wrap items-center gap-xs font-mono text-[11px] text-text-muted">
                        {item.stack.slice(0, 3).map((tech, index) => (
                            <React.Fragment key={tech}>
                                {index > 0 && <span className="text-text-faint">·</span>}
                                <span>{tech}</span>
                            </React.Fragment>
                        ))}
                    </div>
                    {detailHref && (
                        <Link href={detailHref} className="font-semibold text-caption whitespace-nowrap">
                            {detailLabel} →
                        </Link>
                    )}
                </div>
            </div>
        </Card>
    );
}

export function SelectedWork() {
    const { ln } = useTranslation();
    const featured = work.filter((item) => item.featured);

    return (
        <section
            id="work"
            className="max-w-[var(--layout-content-max-width)] mx-auto px-[clamp(20px,4vw,56px)] pb-[clamp(64px,8vw,96px)] scroll-mt-20"
        >
            <Eyebrow className="mb-[20px]">{ln("eyebrow.selectedWork")}</Eyebrow>
            <div className="grid gap-[24px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                {featured.map((item) => (
                    <WorkCard key={item.slug} item={item} />
                ))}
            </div>
        </section>
    );
}
