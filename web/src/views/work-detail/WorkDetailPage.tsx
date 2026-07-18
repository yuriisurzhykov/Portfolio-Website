"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { Text } from "@/shared/ui/text";
import { Tag } from "@/shared/ui/tag";
import { StatusBadge } from "@/shared/ui/status-badge";
import { PlaceholderCover } from "@/shared/ui/placeholder-cover";
import { LinkButton } from "@/shared/ui/button";
import { useTranslation } from "@/shared/i18n";
import { work } from "@/data/work";
import { journal } from "@/data/journal";

export function WorkDetailPage() {
    const {ln, pick} = useTranslation();
    const params = useParams<{ slug: string }>();
    const router = useRouter();
    const item = work.find((entry) => entry.slug === params.slug);

    // See JournalDetailPage for why this is an effect instead of react-router's <Navigate/>.
    React.useEffect(() => {
        if (!item || !item.caseStudy) {
            router.replace("/work");
        }
    }, [item, router]);

    if (!item || !item.caseStudy) {
        return null;
    }

    const {caseStudy} = item;
    const relatedPost = item.relatedPostSlug ? journal.find((post) => post.slug === item.relatedPostSlug) : undefined;
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
                    <span>{ ln("work.caseStudy.started", {date: pick(caseStudy.startedLabel)}) }</span>
                    <span>{ ln(isShipped ? "work.caseStudy.shipped" : "work.caseStudy.target", {date: pick(caseStudy.shippedLabel)}) }</span>
                    <span>{ ln("work.caseStudy.role", {role: pick(caseStudy.role)}) }</span>
                </div>

                <PlaceholderCover
                    className="h-[280px] rounded-xl border border-border-subtle mb-10"
                    label={ `${ item.title.toLowerCase() } — hero screenshot` }
                    src={ caseStudy.heroImage }
                    alt={ item.title }
                />

                { caseStudy.sections.map((section) => (
                    <React.Fragment key={ pick(section.heading) }>
                        <Text as="h2" variant="h2" className="mb-3.5">
                            { pick(section.heading) }
                        </Text>
                        <Text variant="body" tone="muted" className="mb-7 max-w-[70ch] leading-[1.75]">
                            { pick(section.body) }
                        </Text>
                    </React.Fragment>
                )) }

                { caseStudy.approach && (
                    <div
                        className="grid gap-4 mb-7"
                        style={ {gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"} }
                    >
                        { caseStudy.approach.map((step) => (
                            <div key={ pick(step.title) }
                                 className="bg-surface-base border border-border-subtle rounded-lg p-5">
                                <Text as="div" variant="caption"
                                      className="font-mono font-semibold text-accent-text mb-2">
                                    { pick(step.title) }
                                </Text>
                                <Text as="div" variant="caption" tone="muted" className="leading-[1.6]">
                                    { pick(step.description) }
                                </Text>
                            </div>
                        )) }
                    </div>
                ) }

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
