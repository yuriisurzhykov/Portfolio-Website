"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { AdminPostDetail, PostInput, PostStatus } from "@portfolio/backend";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { Button } from "@/shared/ui/button";
import { Field, Input, LocalizedInputField, LocalizedTextareaField, Select } from "@/shared/ui/form";
import { BlockListEditor, blockToDraft, draftToBlockInput, type DraftBlock } from "@/shared/ui/block-editor";
import { AdminApiError, adminApi } from "@/shared/lib/admin-api";

export interface PostEditorPageProps {
    /** Absent for "create new"; present (already-saved) for "edit". */
    initialPost?: AdminPostDetail;
}

interface FormState {
    slug: string;
    date: string;
    dateLabel: string;
    title: { en: string; ru: string };
    category: { en: string; ru: string };
    readMins: string;
    excerpt: { en: string; ru: string };
    status: PostStatus;
    relatedWorkSlug: string;
}

function toFormState(post?: AdminPostDetail): FormState {
    return {
        slug: post?.slug ?? "",
        date: post?.date ?? "",
        dateLabel: post?.dateLabel ?? "",
        title: post?.title ?? { en: "", ru: "" },
        category: post?.category ?? { en: "", ru: "" },
        readMins: post ? String(post.readMins) : "",
        excerpt: post?.excerpt ?? { en: "", ru: "" },
        status: post?.status ?? "published",
        relatedWorkSlug: post?.relatedWorkSlug ?? "",
    };
}

export function PostEditorPage({ initialPost }: PostEditorPageProps) {
    const router = useRouter();
    const isEditing = Boolean(initialPost);

    const [form, setForm] = React.useState<FormState>(() => toFormState(initialPost));
    const [blocks, setBlocks] = React.useState<DraftBlock[]>(() => (initialPost?.blocks ?? []).map(blockToDraft));
    const [error, setError] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);

    function update<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);

        const input: PostInput = {
            slug: form.slug.trim(),
            date: form.date.trim(),
            dateLabel: form.dateLabel.trim() || null,
            title: form.title,
            category: form.category,
            readMins: Number(form.readMins) || 0,
            excerpt: form.excerpt,
            status: form.status,
            relatedWorkSlug: form.relatedWorkSlug.trim() || null,
            blocks: blocks.map(draftToBlockInput),
        };

        setSubmitting(true);
        try {
            if (isEditing && initialPost) {
                await adminApi.updatePost(initialPost.slug, input);
            } else {
                await adminApi.createPost(input);
            }
            router.push("/admin/journal");
            router.refresh();
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Something went wrong. Please try again.");
            setSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!initialPost) return;
        if (!window.confirm(`Delete "${ initialPost.slug }"? This can't be undone.`)) return;

        setDeleting(true);
        try {
            await adminApi.deletePost(initialPost.slug);
            router.push("/admin/journal");
            router.refresh();
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Failed to delete.");
            setDeleting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg pb-4xl">
            <div className="flex items-center justify-between">
                <Text as="h1" variant="h3">{isEditing ? `Edit post: ${ initialPost?.slug }` : "New post"}</Text>
                {isEditing && (
                    <Button type="button" variant="ghost" size="sm" onClick={handleDelete} loading={deleting}>
                        Delete
                    </Button>
                )}
            </div>

            <Card variant="filled" className="p-lg flex flex-col gap-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                    <Field label="Slug" htmlFor="slug" hint="URL segment — lowercase, hyphen-separated.">
                        <Input id="slug" required value={form.slug} onChange={(e) => update("slug", e.target.value)} />
                    </Field>
                    <Field label="Status" htmlFor="status">
                        <Select id="status" value={form.status} onChange={(e) => update("status", e.target.value as PostStatus)}>
                            <option value="published">Published</option>
                            <option value="upcoming">Upcoming</option>
                        </Select>
                    </Field>
                    <Field label="Date" htmlFor="date" hint="ISO format, e.g. 2026-07-19.">
                        <Input id="date" required value={form.date} onChange={(e) => update("date", e.target.value)} />
                    </Field>
                    <Field label="Date label" htmlFor="dateLabel" hint={"Optional override shown for upcoming posts, e.g. \"This spring\"."}>
                        <Input id="dateLabel" value={form.dateLabel} onChange={(e) => update("dateLabel", e.target.value)} />
                    </Field>
                    <Field label="Read minutes" htmlFor="readMins">
                        <Input id="readMins" type="number" min={0} required value={form.readMins} onChange={(e) => update("readMins", e.target.value)} />
                    </Field>
                    <Field label="Related work slug" htmlFor="relatedWorkSlug" hint="Optional — links this post to a work item.">
                        <Input id="relatedWorkSlug" value={form.relatedWorkSlug} onChange={(e) => update("relatedWorkSlug", e.target.value)} />
                    </Field>
                </div>

                <LocalizedInputField label="Title" value={form.title} onChange={(title) => update("title", title)} required />
                <LocalizedInputField label="Category" value={form.category} onChange={(category) => update("category", category)} required />
                <LocalizedTextareaField label="Excerpt" value={form.excerpt} onChange={(excerpt) => update("excerpt", excerpt)} rows={2} required />
            </Card>

            <div className="flex flex-col gap-sm">
                <Text variant="h5" as="h2">Body</Text>
                <BlockListEditor blocks={blocks} onChange={setBlocks} />
            </div>

            {error && (
                <Text variant="caption" className="text-status-error" role="alert">{error}</Text>
            )}

            <div className="flex gap-sm">
                <Button type="submit" loading={submitting}>{isEditing ? "Save changes" : "Create post"}</Button>
                <Button type="button" variant="secondary" onClick={() => router.push("/admin/journal")}>Cancel</Button>
            </div>
        </form>
    );
}
