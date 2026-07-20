"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { PostSummary } from "@portfolio/backend";
import { Text } from "@/shared/ui/text";
import { LinkButton } from "@/shared/ui/button/LinkButton";
import { StatusBadge } from "@/shared/ui/status-badge";
import { AdminListItem } from "@/shared/ui/admin-list-item";
import { AdminApiError, adminApi } from "@/shared/lib/admin-api";
import { formatAdminDate } from "@/shared/lib/date-format";

export interface AdminJournalListPageProps {
    entries: PostSummary[];
}

export function AdminJournalListPage({ entries }: AdminJournalListPageProps) {
    const router = useRouter();
    const [deletingSlug, setDeletingSlug] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    async function handleDelete(slug: string) {
        if (!window.confirm(`Delete "${ slug }"? This can't be undone.`)) return;

        setError(null);
        setDeletingSlug(slug);
        try {
            await adminApi.deletePost(slug);
            router.refresh();
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Failed to delete.");
        } finally {
            setDeletingSlug(null);
        }
    }

    return (
        <div className="flex flex-col gap-lg">
            <div className="flex items-center justify-between">
                <Text as="h1" variant="h3">Journal</Text>
                <LinkButton href="/admin/journal/new">+ New post</LinkButton>
            </div>

            {error && <Text variant="caption" className="text-status-error" role="alert">{error}</Text>}

            {entries.length === 0 ? (
                <Text variant="body" tone="muted">No posts yet.</Text>
            ) : (
                <div className="flex flex-col gap-sm">
                    {entries.map((post) => (
                        <AdminListItem
                            key={post.slug}
                            badges={<StatusBadge tone={post.status === "published" ? "success" : "warning"}>{post.status}</StatusBadge>}
                            meta={formatAdminDate(post.date)}
                            title={post.title.en}
                            slug={post.slug}
                            editHref={`/admin/journal/${ post.slug }/edit`}
                            onDelete={() => handleDelete(post.slug)}
                            deleting={deletingSlug === post.slug}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
