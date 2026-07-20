"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { AdminPostDetail, PostInput, PostStatus } from "@portfolio/backend";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { Button } from "@/shared/ui/button";
import { Field, Input, Select, Textarea } from "@/shared/ui/form";
import { BlockEditor, type BlockEditorHandle } from "@/shared/ui/block-editor";
import { AdminApiError, adminApi } from "@/shared/lib/admin-api";

export interface PostEditorPageProps {
    /** Absent for "create new"; present (already-saved) for "edit". */
    initialPost?: AdminPostDetail;
}

interface FormState {
    slug: string;
    date: string;
    dateLabel: string;
    title: string;
    category: string;
    readMins: string;
    excerpt: string;
    status: PostStatus;
    relatedWorkSlug: string;
}

/**
 * English-only form — see the migration plan's "перевод — отдельная
 * страница, не параллельный ввод". `initialPost.title`/`category`/
 * `excerpt` are still full `{en, ru}` pairs (the read side hasn't
 * changed), this page just only ever shows/edits `.en` — the `ru` side
 * (if any exists already) is preserved server-side by `updatePost` (see
 * its comment in admin-posts.ts), never touched here. "Add translation"
 * below links to the one screen that does touch it.
 */
function toFormState(post?: AdminPostDetail): FormState {
    return {
        slug: post?.slug ?? "",
        date: post?.date ?? "",
        dateLabel: post?.dateLabel ?? "",
        title: post?.title.en ?? "",
        category: post?.category.en ?? "",
        readMins: post ? String(post.readMins) : "",
        excerpt: post?.excerpt.en ?? "",
        status: post?.status ?? "published",
        relatedWorkSlug: post?.relatedWorkSlug ?? "",
    };
}

export function PostEditorPage({ initialPost }: PostEditorPageProps) {
    const router = useRouter();
    const isEditing = Boolean(initialPost);

    const [form, setForm] = React.useState<FormState>(() => toFormState(initialPost));
    const blockEditorRef = React.useRef<BlockEditorHandle>(null);
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
            title: form.title.trim(),
            category: form.category.trim(),
            readMins: Number(form.readMins) || 0,
            excerpt: form.excerpt.trim(),
            status: form.status,
            relatedWorkSlug: form.relatedWorkSlug.trim() || null,
            blocks: blockEditorRef.current?.getBlocks() ?? [],
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
                <div className="flex items-center gap-sm">
                    {isEditing && (
                        <Button type="button" variant="secondary" size="sm" onClick={() => router.push(`/admin/journal/${ initialPost?.slug }/translate`)}>
                            {initialPost?.title.ru ? "Edit translation" : "Add translation"}
                        </Button>
                    )}
                    {isEditing && (
                        <Button type="button" variant="ghost" size="sm" onClick={handleDelete} loading={deleting}>
                            Delete
                        </Button>
                    )}
                </div>
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

                <Field label="Title" htmlFor="title">
                    <Input id="title" required value={form.title} onChange={(e) => update("title", e.target.value)} />
                </Field>
                <Field label="Category" htmlFor="category">
                    <Input id="category" required value={form.category} onChange={(e) => update("category", e.target.value)} />
                </Field>
                <Field label="Excerpt" htmlFor="excerpt">
                    <Textarea id="excerpt" required rows={2} value={form.excerpt} onChange={(e) => update("excerpt", e.target.value)} />
                </Field>
            </Card>

            <div className="flex flex-col gap-sm">
                <Text variant="h5" as="h2">Body</Text>
                <BlockEditor ref={blockEditorRef} initialBlocks={initialPost?.blocks ?? []} />
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
