"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { WorkSummary } from "@portfolio/backend";
import { Text } from "@/shared/ui/text";
import { LinkButton } from "@/shared/ui/button/LinkButton";
import { StatusBadge } from "@/shared/ui/status-badge";
import { AdminListItem } from "@/shared/ui/admin-list-item";
import { AdminApiError, adminApi } from "@/shared/lib/admin-api";

export interface AdminWorkListPageProps {
    items: WorkSummary[];
}

export function AdminWorkListPage({ items }: AdminWorkListPageProps) {
    const router = useRouter();
    const [deletingSlug, setDeletingSlug] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    async function handleDelete(slug: string) {
        if (!window.confirm(`Delete "${ slug }"? This can't be undone.`)) return;

        setError(null);
        setDeletingSlug(slug);
        try {
            await adminApi.deleteWork(slug);
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
                <Text as="h1" variant="h3">Work</Text>
                <LinkButton href="/admin/work/new">+ New work item</LinkButton>
            </div>

            {error && <Text variant="caption" className="text-status-error" role="alert">{error}</Text>}

            {items.length === 0 ? (
                <Text variant="body" tone="muted">No work items yet.</Text>
            ) : (
                <div className="flex flex-col gap-sm">
                    {items.map((item) => (
                        <AdminListItem
                            key={item.slug}
                            badges={(
                                <>
                                    <StatusBadge tone={item.status === "shipped" ? "success" : "warning"}>{item.status}</StatusBadge>
                                    {item.featured && <StatusBadge tone="accent">Featured</StatusBadge>}
                                </>
                            )}
                            meta={item.year}
                            title={item.title}
                            slug={item.slug}
                            editHref={`/admin/work/${ item.slug }/edit`}
                            onDelete={() => handleDelete(item.slug)}
                            deleting={deletingSlug === item.slug}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
