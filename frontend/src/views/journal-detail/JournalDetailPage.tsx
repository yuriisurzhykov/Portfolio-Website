"use client";

import * as React from "react";
import Link from "next/link";
import type { PostDetail, WorkDetail } from "@portfolio/backend";
import { Text } from "@/shared/ui/text";
import { StatusBadge } from "@/shared/ui/status-badge";
import { ContentBlocks } from "@/shared/ui/content-blocks";
import { RelatedContentCallout } from "@/shared/ui/related-content-callout";
import { useTranslation } from "@/shared/i18n";
import { formatMonthYear } from "@/shared/lib/date-format";
import { CoverImage } from "@/shared/ui/cover-image";
import { accentColorForHue } from "@/shared/lib/hue-accent";

export interface JournalDetailPageProps {
    post: PostDetail;
    relatedWork: WorkDetail | null;
    /**
     * This post's own resolved hue (`resolvePostHue`, backend — inherits
     * the linked Work's hue when `relatedWorkSlug` is set, falls back to
     * the category's hue otherwise) — resolved server-side by the route,
     * same reasoning as `WorkDetailPage.hue`'s own comment. Drives the
     * category pill's accent color; see the plan's decision that hue
     * accents only ever appear on detail pages.
     */
    hue: number;
    /** Set only by the route when `?preview=1` came from an authenticated admin (see `(site)/journal/[slug]/page.tsx`) — renders a banner so the page can never be mistaken for what a real reader sees, and `post` in this case is the DRAFT-priority content, not necessarily what's actually live. */
    isPreview?: boolean;
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
export function JournalDetailPage({ post, relatedWork, hue, isPreview = false }: JournalDetailPageProps) {
    const { ln, pick } = useTranslation();

    return (
        <main>
            { isPreview && (
                <div
                    className="sticky top-0 z-50 bg-status-warning-tint-bg text-status-warning border-b border-border-subtle py-2 px-4 text-center text-caption font-medium">
                    Preview — showing unpublished draft content, not what's currently live.
                </div>
            ) }
            <div
                className="max-w-(--layout-content-reading) mx-auto px-(--layout-reading-horizontal-padding) pt-(--layout-reading-top-padding) pb-25">
                <Link href="/journal" className="font-mono text-caption text-text-muted">
                    ← { ln("button.backToJournal") }
                </Link>

                <div className="flex gap-sm items-center mt-lg mb-md flex-wrap">
                    <StatusBadge tone="accent" style={ { backgroundColor: accentColorForHue(hue) } }>
                        { pick(post.category) }
                    </StatusBadge>
                    <Text variant="caption" tone="faint" className="font-mono">
                        { formatMonthYear(post.date) } · { ln("journal.readMins", { count: post.readMins }) }
                    </Text>
                </div>

                <Text as="h1" variant="h1" className="m-0 mb-md">
                    { pick(post.title) }
                </Text>

                { post.cover && (
                    // This is the page's LCP element — `fetchPriority="high"`
                    // plus `loading="eager"` (never lazy, unlike the cards
                    // below the fold on JournalListPage/JournalPreview).
                    <CoverImage
                        { ...post.cover }
                        fetchPriority="high"
                        loading="eager"
                        className="w-full h-auto mb-xl rounded-xl border border-border-subtle"
                    />
                ) }

                <ContentBlocks blocks={ post.body }/>

                { relatedWork && relatedWork.caseStudy && (
                    <RelatedContentCallout
                        className="mt-2xl"
                        eyebrow={ ln("eyebrow.relatedProject") }
                        title={ pick(relatedWork.title) }
                        body={ pick(relatedWork.summary) }
                        href={ `/work/${ relatedWork.slug }` }
                        buttonLabel={ ln("button.viewCaseStudy") }
                    />
                ) }
            </div>
        </main>
    );
}
