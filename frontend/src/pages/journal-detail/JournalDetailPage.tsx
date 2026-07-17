import * as React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Text } from "@/shared/ui/text";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { StatusBadge } from "@/shared/ui/status-badge";
import { LinkButton } from "@/shared/ui/button";
import { ContentBlocks } from "@/shared/ui/content-blocks";
import { useTranslation } from "@/shared/i18n";
import { journal } from "@/data/journal";
import { work } from "@/data/work";

const monthYearFormatter = new Intl.DateTimeFormat("en-US", {month: "long", year: "numeric"});

export function JournalDetailPage() {
    const {ln} = useTranslation();
    const {slug} = useParams<{ slug: string }>();
    const post = journal.find((entry) => entry.slug === slug);

    if (!post || !post.body) {
        return <Navigate to="/journal" replace/>;
    }

    const relatedWork = post.relatedWorkSlug ? work.find((item) => item.slug === post.relatedWorkSlug) : undefined;

    return (
        <main>
            <div
                className="max-w-(--layout-content-reading) mx-auto px-[clamp(20px,4vw,24px)] pt-[clamp(48px,7vw,80px)] pb-[100px]">
                <Link to="/journal" className="font-mono text-caption text-text-muted">
                    ← { ln("button.backToJournal") }
                </Link>

                <div className="flex gap-sm items-center mt-7 mb-[18px] flex-wrap">
                    <StatusBadge tone="accent">{ post.category }</StatusBadge>
                    <Text variant="caption" tone="faint" className="font-mono">
                        { monthYearFormatter.format(new Date(post.date)) } · { ln("journal.readMins", {count: post.readMins}) }
                    </Text>
                </div>

                <h1 className="m-0 mb-5 font-extrabold text-[clamp(30px,4.2vw,44px)] leading-[1.15] tracking-tight text-text-primary">
                    { post.title }
                </h1>

                <ContentBlocks blocks={ post.body }/>

                { relatedWork && relatedWork.caseStudy && (
                    <div
                        className="mt-10 bg-surface-base border border-border-subtle rounded-xl p-6 flex justify-between items-center gap-md flex-wrap">
                        <div>
                            <Eyebrow className="mb-1.5">{ ln("eyebrow.relatedProject") }</Eyebrow>
                            <Text as="div" variant="h3" className="text-[17px]!">
                                { relatedWork.title }
                            </Text>
                            <Text as="div" variant="caption" tone="muted">
                                { relatedWork.summary }
                            </Text>
                        </div>
                        <LinkButton href={ `/work/${ relatedWork.slug }` } variant="primary">
                            { ln("button.viewCaseStudy") } →
                        </LinkButton>
                    </div>
                ) }
            </div>
        </main>
    );
}
