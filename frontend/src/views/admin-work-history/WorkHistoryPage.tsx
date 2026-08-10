"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { RevisionSummary } from "@portfolio/backend";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { Button } from "@/shared/ui/button";
import { AdminApiError, adminApi } from "@/shared/lib/admin-api";
import { formatAdminDateTime } from "@/shared/lib/date-format";

export interface WorkHistoryPageProps {
    slug: string;
    revisions: RevisionSummary[];
}

/** Work's half of `admin-post-history`'s `PostHistoryPage` — same reasoning, same "restore never publishes by itself" design. */
export function WorkHistoryPage({ slug, revisions }: WorkHistoryPageProps) {
    const router = useRouter();
    const [restoringId, setRestoringId] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    async function handleRestore(revisionId: string) {
        if (!window.confirm("Load this version into the draft? It replaces whatever's currently pending — you'll still need to Publish/Update to make it live.")) {
            return;
        }

        setError(null);
        setRestoringId(revisionId);
        try {
            await adminApi.restoreWorkRevision(slug, revisionId);
            router.push(`/admin/work/${ slug }/edit`);
            router.refresh();
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Failed to load this version into the draft.");
            setRestoringId(null);
        }
    }

    return (
        <div className="flex flex-col gap-lg">
            <div className="flex items-center justify-between gap-md flex-wrap">
                <Text as="h1" variant="h3">History: {slug}</Text>
                <Button variant="secondary" size="sm" onClick={() => router.push(`/admin/work/${ slug }/edit`)}>
                    Back to editor
                </Button>
            </div>
            <Text variant="caption" tone="faint" className="max-w-[64ch]">
                Every past published version of this item, newest first. Nothing here changes what's live —
                "Load into draft" only replaces the editor's pending draft so you can review it before publishing again.
            </Text>

            {error && <Text variant="caption" className="text-status-error" role="alert">{error}</Text>}

            {revisions.length === 0 ? (
                <Text variant="body" tone="muted">
                    No past versions yet — history starts recording the first time you Update an already-published item.
                </Text>
            ) : (
                <div className="flex flex-col gap-sm">
                    {revisions.map((revision) => (
                        <Card key={revision.id} variant="filled" className="p-md flex items-center justify-between gap-md flex-wrap">
                            <Text variant="body">Published {formatAdminDateTime(revision.publishedAt)}</Text>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => handleRestore(revision.id)}
                                loading={restoringId === revision.id}
                            >
                                Load into draft
                            </Button>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
