"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { AdminPostDetail, PostInput, PostStatus } from "@portfolio/backend";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { Button } from "@/shared/ui/button";
import { Field, Input, Textarea } from "@/shared/ui/form";
import { Tag } from "@/shared/ui/tag";
import { StatusToggle, type StatusToggleOption } from "@/shared/ui/status-toggle";
import { BlockEditor, type BlockEditorHandle } from "@/shared/ui/block-editor";
import { AdminApiError, adminApi } from "@/shared/lib/admin-api";
import { slugify } from "@/shared/lib/slugify";
import { formatAdminDate, todayIsoDate } from "@/shared/lib/date-format";

export interface PostEditorPageProps {
    /** Absent for "create new"; present (already-saved) for "edit". */
    initialPost?: AdminPostDetail;
    /** Every distinct English category already in use, for `CategoryPicker`'s chips — see `getDistinctPostCategories` (backend). */
    existingCategories: string[];
}

interface FormState {
    slug: string;
    title: string;
    category: string;
    readMins: string;
    excerpt: string;
    status: PostStatus;
    relatedWorkSlug: string;
}

const STATUS_OPTIONS: StatusToggleOption<PostStatus>[] = [
    { value: "published", label: "Published", tone: "success" },
    { value: "upcoming", label: "Upcoming", tone: "warning" },
];

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
        title: post?.title.en ?? "",
        category: post?.category.en ?? "",
        readMins: post ? String(post.readMins) : "",
        excerpt: post?.excerpt.en ?? "",
        status: post?.status ?? "published",
        relatedWorkSlug: post?.relatedWorkSlug ?? "",
    };
}

export function PostEditorPage({ initialPost, existingCategories }: PostEditorPageProps) {
    const router = useRouter();
    const isEditing = Boolean(initialPost);

    const [form, setForm] = React.useState<FormState>(() => toFormState(initialPost));
    // Only a NEW post's slug follows the title — an existing post already
    // has a real, possibly-linked-to URL; retitling it must never silently
    // change that. `useState(isEditing)`: for an existing post this starts
    // (and stays) "touched" from the very first render, for a new one it
    // starts "untouched" so the very first keystroke in Title already
    // fills Slug, without the admin having typed a slug themselves first.
    const [slugTouched, setSlugTouched] = React.useState(isEditing);
    const blockEditorRef = React.useRef<BlockEditorHandle>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);

    function update<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function updateTitle(title: string) {
        setForm((prev) => ({
            ...prev,
            title,
            slug: slugTouched ? prev.slug : slugify(title),
        }));
    }

    function updateSlugManually(slug: string) {
        setSlugTouched(true);
        update("slug", slug);
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);

        const input: PostInput = {
            slug: form.slug.trim(),
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
            <div className="flex items-start justify-between gap-md flex-wrap">
                <div className="flex flex-col gap-sm">
                    <Text as="h1" variant="h3">{isEditing ? `Edit post: ${ initialPost?.slug }` : "New post"}</Text>
                    <div className="flex items-center gap-sm flex-wrap">
                        <StatusToggle value={form.status} onChange={(status) => update("status", status)} options={STATUS_OPTIONS} />
                        <Text variant="caption" tone="faint" className="font-mono">
                            {isEditing
                                ? `Created ${ formatAdminDate(initialPost!.date) }`
                                : `Will be dated ${ formatAdminDate(todayIsoDate()) } — set automatically on save`}
                        </Text>
                    </div>
                </div>
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
                <Field label="Title" htmlFor="title">
                    <Input id="title" required value={form.title} onChange={(e) => updateTitle(e.target.value)} />
                </Field>
                <Field label="Slug" htmlFor="slug" hint="Auto-generated from the title — edit if you want a different URL.">
                    <Input id="slug" required value={form.slug} onChange={(e) => updateSlugManually(e.target.value)} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                    <Field label="Read minutes" htmlFor="readMins" hint={"Shown as \"X min read\" on the published post."}>
                        <Input id="readMins" type="number" min={0} required value={form.readMins} onChange={(e) => update("readMins", e.target.value)} />
                    </Field>
                    <Field label="Related work slug" htmlFor="relatedWorkSlug" hint="Optional — links this post to a work item.">
                        <Input id="relatedWorkSlug" value={form.relatedWorkSlug} onChange={(e) => update("relatedWorkSlug", e.target.value)} />
                    </Field>
                </div>

                <CategoryPicker
                    value={form.category}
                    onChange={(category) => update("category", category)}
                    existingCategories={existingCategories}
                />

                <Field
                    label="Excerpt"
                    htmlFor="excerpt"
                    hint="Short teaser shown on the /journal list page, under the title — not shown on the post itself."
                >
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

/**
 * Chips for every category already used elsewhere (click to fill the
 * field below with it) plus a plain text input for a brand new one — NOT
 * a multi-select tag input: a post has exactly one category, same as
 * before, this only changes HOW that one value gets picked. The input is
 * the actual source of truth (`value`/`onChange` go straight to
 * `form.category`); the chips are just a shortcut that fills it, so
 * typing a category that isn't in the list yet always works too.
 */
function CategoryPicker({
    value,
    onChange,
    existingCategories,
}: {
    value: string;
    onChange: (value: string) => void;
    existingCategories: string[];
}) {
    return (
        <div className="flex flex-col gap-xs">
            <span className="text-caption font-medium text-text-secondary">Category</span>
            {existingCategories.length > 0 && (
                <div className="flex flex-wrap gap-xs">
                    {existingCategories.map((category) => (
                        <button key={category} type="button" onClick={() => onChange(category)}>
                            <Tag variant={value === category ? "accent" : "neutral"}>{category}</Tag>
                        </button>
                    ))}
                </div>
            )}
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Or type a new category"
                required
                aria-label="Category"
            />
        </div>
    );
}
