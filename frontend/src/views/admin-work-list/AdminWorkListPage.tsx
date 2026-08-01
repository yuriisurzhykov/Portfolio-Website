"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { LifecycleState, WorkSummary } from "@portfolio/backend";
import { Text } from "@/shared/ui/text";
import { LinkButton } from "@/shared/ui/button/LinkButton";
import { StatusBadge } from "@/shared/ui/status-badge";
import { StatusToggle, type StatusToggleOption } from "@/shared/ui/status-toggle";
import { AdminListItem } from "@/shared/ui/admin-list-item";
import { AdminApiError, adminApi } from "@/shared/lib/admin-api";

export interface AdminWorkListPageProps {
    items: WorkSummary[];
}

/** Same tab shape/reasoning as `AdminJournalListPage`'s `lifecycleOptions` — see its comment. */
function lifecycleOptions(items: WorkSummary[]): StatusToggleOption<LifecycleState>[] {
    const count = (state: LifecycleState) => items.filter((item) => item.lifecycleState === state).length;
    return [
        { value: "PUBLISHED", label: `Published (${ count("PUBLISHED") })`, tone: "success" },
        { value: "DRAFT", label: `Draft (${ count("DRAFT") })`, tone: "warning" },
    ];
}

export function AdminWorkListPage({ items }: AdminWorkListPageProps) {
    const router = useRouter();
    const [tab, setTab] = React.useState<LifecycleState>("PUBLISHED");
    const [deletingSlug, setDeletingSlug] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const visibleItems = items.filter((item) => item.lifecycleState === tab);

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

            <StatusToggle value={tab} onChange={setTab} options={lifecycleOptions(items)} />

            {error && <Text variant="caption" className="text-status-error" role="alert">{error}</Text>}

            {visibleItems.length === 0 ? (
                <Text variant="body" tone="muted">
                    {tab === "DRAFT" ? "No drafts right now." : "No published work items yet."}
                </Text>
            ) : (
                <div className="flex flex-col gap-sm">
                    {visibleItems.map((item) => (
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
