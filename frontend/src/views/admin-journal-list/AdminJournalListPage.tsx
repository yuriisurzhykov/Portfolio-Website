"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { AdminPostListItem, LifecycleState } from "@portfolio/backend";
import { Text } from "@/shared/ui/text";
import { LinkButton } from "@/shared/ui/button/LinkButton";
import { StatusBadge } from "@/shared/ui/status-badge";
import { StatusToggle, type StatusToggleOption } from "@/shared/ui/status-toggle";
import { AdminListItem } from "@/shared/ui/admin-list-item";
import { AdminApiError, adminApi } from "@/shared/lib/admin-api";
import { formatAdminDate } from "@/shared/lib/date-format";

export interface AdminJournalListPageProps {
    entries: AdminPostListItem[];
}

/**
 * "Published" first (not "Draft") — matches the tab order a returning
 * admin most likely expects to land on: the list they're used to seeing
 * in full, from before this Draft/Published split existed. Warning tone
 * for Draft mirrors "upcoming"/"in-progress" elsewhere in the admin —
 * "not fully live yet," the same visual meaning.
 */
function lifecycleOptions(entries: AdminPostListItem[]): StatusToggleOption<LifecycleState>[] {
    const count = (state: LifecycleState) => entries.filter((e) => e.lifecycleState === state).length;
    return [
        { value: "PUBLISHED", label: `Published (${ count("PUBLISHED") })`, tone: "success" },
        { value: "DRAFT", label: `Draft (${ count("DRAFT") })`, tone: "warning" },
    ];
}

export function AdminJournalListPage({ entries }: AdminJournalListPageProps) {
    const router = useRouter();
    const [tab, setTab] = React.useState<LifecycleState>("PUBLISHED");
    const [deletingSlug, setDeletingSlug] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    // Filtered client-side, not a separate fetch per tab — the Server
    // Component above already loaded every post (both lifecycle states)
    // in one query (`getPostsForAdmin`), see its own comment.
    const visibleEntries = entries.filter((post) => post.lifecycleState === tab);

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

            <StatusToggle value={tab} onChange={setTab} options={lifecycleOptions(entries)} />

            {error && <Text variant="caption" className="text-status-error" role="alert">{error}</Text>}

            {visibleEntries.length === 0 ? (
                <Text variant="body" tone="muted">
                    {tab === "DRAFT" ? "No drafts right now." : "No published posts yet."}
                </Text>
            ) : (
                <div className="flex flex-col gap-sm">
                    {visibleEntries.map((post) => (
                        <AdminListItem
                            key={post.slug}
                            badges={(
                                <>
                                    <StatusBadge tone={post.status === "published" ? "success" : "warning"}>{post.status}</StatusBadge>
                                    {/* Only meaningful for an already-PUBLISHED post — a DRAFT one is unpublished either way, so this would just be noise. */}
                                    {post.lifecycleState === "PUBLISHED" && post.hasUnpublishedChanges && (
                                        <StatusBadge tone="warning">Unpublished changes</StatusBadge>
                                    )}
                                </>
                            )}
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
