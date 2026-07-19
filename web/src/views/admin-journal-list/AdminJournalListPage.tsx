"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { PostSummary } from "@portfolio/backend";
import { Text } from "@/shared/ui/text";
import { Button } from "@/shared/ui/button";
import { LinkButton } from "@/shared/ui/button/LinkButton";
import { Card } from "@/shared/ui/card";
import { StatusBadge } from "@/shared/ui/status-badge";
import { AdminApiError, adminApi } from "@/shared/lib/admin-api";

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
                        <Card key={post.slug} variant="outlined" className="p-md flex items-center justify-between gap-md">
                            <div className="flex flex-col gap-xs min-w-0">
                                <div className="flex items-center gap-sm">
                                    <Text variant="body" className="font-medium truncate">{post.title.en}</Text>
                                    <StatusBadge tone={post.status === "published" ? "success" : "accent"}>{post.status}</StatusBadge>
                                </div>
                                <Text variant="caption" tone="faint" className="font-mono">{post.slug} · {post.date}</Text>
                            </div>
                            <div className="flex items-center gap-sm shrink-0">
                                <Link href={`/admin/journal/${ post.slug }/edit`}>
                                    <Button type="button" variant="secondary" size="sm">Edit</Button>
                                </Link>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(post.slug)}
                                    loading={deletingSlug === post.slug}
                                    iconLeft={<Trash2 className="w-4 h-4" aria-hidden="true" />}
                                >
                                    Delete
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
