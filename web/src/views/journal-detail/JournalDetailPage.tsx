"use client";

import * as React from "react";
import Link from "next/link";
import type { PostDetail, WorkDetail } from "@portfolio/backend";
import { Text } from "@/shared/ui/text";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { StatusBadge } from "@/shared/ui/status-badge";
import { LinkButton } from "@/shared/ui/button";
import { ContentBlocks } from "@/shared/ui/content-blocks";
import { useTranslation } from "@/shared/i18n";
import { formatMonthYear } from "@/shared/lib/date-format";

export interface JournalDetailPageProps {
    post: PostDetail;
    relatedWork: WorkDetail | null;
}

/**
 * `post`/`relatedWork` arrive already resolved from the Server Component
 * route (app/(site)/journal/[slug]/page.tsx) — that's also where "post not
 * found" is handled now, via Next's `notFound()` (a real 404 response),
 * replacing Phase 1's client-side `useRouter().replace()` workaround. That
 * workaround existed only because Phase 1's data was still a static import
 * with no natural place to do a server-side existence check; DB-backed
 * data has one (the route file), so the hack goes away rather than
 * carrying it forward.
 */
export function JournalDetailPage({ post, relatedWork }: JournalDetailPageProps) {
    const { ln, pick } = useTranslation();

    return (
        <main>
            <div
                className="max-w-(--layout-content-reading) mx-auto px-[clamp(20px,4vw,24px)] pt-[clamp(48px,7vw,80px)] pb-[100px]">
                <Link href="/journal" className="font-mono text-caption text-text-muted">
                    ← { ln("button.backToJournal") }
                </Link>

                <div className="flex gap-sm items-center mt-7 mb-[18px] flex-wrap">
                    <StatusBadge tone="accent">{ pick(post.category) }</StatusBadge>
                    <Text variant="caption" tone="faint" className="font-mono">
                        { formatMonthYear(post.date) } · { ln("journal.readMins", { count: post.readMins }) }
                    </Text>
                </div>

                <h1 className="m-0 mb-5 font-extrabold text-[clamp(30px,4.2vw,44px)] leading-[1.15] tracking-tight text-text-primary">
                    { pick(post.title) }
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
                                { pick(relatedWork.summary) }
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
