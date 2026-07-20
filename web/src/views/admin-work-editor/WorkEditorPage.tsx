"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { WorkDetail, WorkInput, WorkStatus } from "@portfolio/backend";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { Button } from "@/shared/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/shared/ui/form";
import { BlockEditor, type BlockEditorHandle } from "@/shared/ui/block-editor";
import { AdminApiError, adminApi } from "@/shared/lib/admin-api";

export interface WorkEditorPageProps {
    /** Absent for "create new"; present (already-saved) for "edit". */
    initialWork?: WorkDetail;
}

interface FormState {
    slug: string;
    title: string;
    year: string;
    status: WorkStatus;
    summary: string;
    stack: string;
    coverImage: string;
    featured: boolean;
    relatedPostSlug: string;
    hasCaseStudy: boolean;
    startedLabel: string;
    shippedLabel: string;
    role: string;
    heroImage: string;
}

/** English-only — same reasoning as `PostEditorPage`'s `toFormState`. `initialWork`'s localized fields stay full `{en, ru}` pairs on the read side; only `.en` is ever shown/edited here. */
function toFormState(work?: WorkDetail): FormState {
    return {
        slug: work?.slug ?? "",
        title: work?.title ?? "",
        year: work ? String(work.year) : String(new Date().getFullYear()),
        status: work?.status ?? "shipped",
        summary: work?.summary.en ?? "",
        stack: work?.stack.join(", ") ?? "",
        coverImage: work?.coverImage ?? "",
        featured: work?.featured ?? false,
        relatedPostSlug: work?.relatedPostSlug ?? "",
        hasCaseStudy: Boolean(work?.caseStudy),
        startedLabel: work?.caseStudy?.startedLabel.en ?? "",
        shippedLabel: work?.caseStudy?.shippedLabel.en ?? "",
        role: work?.caseStudy?.role.en ?? "",
        heroImage: work?.caseStudy?.heroImage ?? "",
    };
}

export function WorkEditorPage({ initialWork }: WorkEditorPageProps) {
    const router = useRouter();
    const isEditing = Boolean(initialWork);

    const [form, setForm] = React.useState<FormState>(() => toFormState(initialWork));
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

        const input: WorkInput = {
            slug: form.slug.trim(),
            title: form.title.trim(),
            year: Number(form.year) || 0,
            status: form.status,
            summary: form.summary.trim(),
            stack: form.stack.split(",").map((s) => s.trim()).filter(Boolean),
            coverImage: form.coverImage.trim() || null,
            featured: form.featured,
            relatedPostSlug: form.relatedPostSlug.trim() || null,
            caseStudy: form.hasCaseStudy
                ? {
                    startedLabel: form.startedLabel.trim(),
                    shippedLabel: form.shippedLabel.trim(),
                    role: form.role.trim(),
                    heroImage: form.heroImage.trim() || null,
                    blocks: blockEditorRef.current?.getBlocks() ?? [],
                }
                : null,
        };

        setSubmitting(true);
        try {
            if (isEditing && initialWork) {
                await adminApi.updateWork(initialWork.slug, input);
            } else {
                await adminApi.createWork(input);
            }
            router.push("/admin/work");
            router.refresh();
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Something went wrong. Please try again.");
            setSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!initialWork) return;
        if (!window.confirm(`Delete "${ initialWork.slug }"? This can't be undone.`)) return;

        setDeleting(true);
        try {
            await adminApi.deleteWork(initialWork.slug);
            router.push("/admin/work");
            router.refresh();
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Failed to delete.");
            setDeleting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg pb-4xl">
            <div className="flex items-center justify-between">
                <Text as="h1" variant="h3">{isEditing ? `Edit work: ${ initialWork?.slug }` : "New work item"}</Text>
                <div className="flex items-center gap-sm">
                    {isEditing && (
                        <Button type="button" variant="secondary" size="sm" onClick={() => router.push(`/admin/work/${ initialWork?.slug }/translate`)}>
                            {initialWork?.summary.ru ? "Edit translation" : "Add translation"}
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
                    <Field label="Title" htmlFor="title" hint="Not localized — same value in both languages on the public site.">
                        <Input id="title" required value={form.title} onChange={(e) => update("title", e.target.value)} />
                    </Field>
                    <Field label="Year" htmlFor="year">
                        <Input id="year" type="number" required value={form.year} onChange={(e) => update("year", e.target.value)} />
                    </Field>
                    <Field label="Status" htmlFor="status">
                        <Select id="status" value={form.status} onChange={(e) => update("status", e.target.value as WorkStatus)}>
                            <option value="shipped">Shipped</option>
                            <option value="in-progress">In progress</option>
                        </Select>
                    </Field>
                    <Field label="Stack" htmlFor="stack" hint="Comma-separated, e.g. Kotlin, Jetpack Compose.">
                        <Input id="stack" value={form.stack} onChange={(e) => update("stack", e.target.value)} />
                    </Field>
                    <Field label="Cover image" htmlFor="coverImage" hint="Optional — small ledger/card thumbnail.">
                        <Input id="coverImage" value={form.coverImage} onChange={(e) => update("coverImage", e.target.value)} />
                    </Field>
                    <Field label="Related post slug" htmlFor="relatedPostSlug" hint="Optional — links this item to a journal post.">
                        <Input id="relatedPostSlug" value={form.relatedPostSlug} onChange={(e) => update("relatedPostSlug", e.target.value)} />
                    </Field>
                    <div className="flex items-end pb-[11px]">
                        <Checkbox label="Featured on landing page" checked={form.featured} onChange={(e) => update("featured", e.target.checked)} />
                    </div>
                </div>

                <Field label="Summary" htmlFor="summary">
                    <Textarea id="summary" required rows={2} value={form.summary} onChange={(e) => update("summary", e.target.value)} />
                </Field>
            </Card>

            <Card variant="filled" className="p-lg flex flex-col gap-md">
                <Checkbox
                    label="Has a case study"
                    checked={form.hasCaseStudy}
                    onChange={(e) => update("hasCaseStudy", e.target.checked)}
                />

                {form.hasCaseStudy && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                            <Field label="Started" htmlFor="startedLabel">
                                <Input id="startedLabel" required value={form.startedLabel} onChange={(e) => update("startedLabel", e.target.value)} />
                            </Field>
                            <Field label="Shipped" htmlFor="shippedLabel">
                                <Input id="shippedLabel" required value={form.shippedLabel} onChange={(e) => update("shippedLabel", e.target.value)} />
                            </Field>
                        </div>
                        <Field label="Role" htmlFor="role">
                            <Input id="role" required value={form.role} onChange={(e) => update("role", e.target.value)} />
                        </Field>
                        <Field label="Hero image" htmlFor="heroImage" hint="Optional — large case-study detail page image.">
                            <Input id="heroImage" value={form.heroImage} onChange={(e) => update("heroImage", e.target.value)} />
                        </Field>

                        <div className="flex flex-col gap-sm mt-sm">
                            <Text variant="h5" as="h2">Case study body</Text>
                            <BlockEditor ref={blockEditorRef} initialBlocks={initialWork?.caseStudy?.blocks ?? []} />
                        </div>
                    </>
                )}
            </Card>

            {error && (
                <Text variant="caption" className="text-status-error" role="alert">{error}</Text>
            )}

            <div className="flex gap-sm">
                <Button type="submit" loading={submitting}>{isEditing ? "Save changes" : "Create work item"}</Button>
                <Button type="button" variant="secondary" onClick={() => router.push("/admin/work")}>Cancel</Button>
            </div>
        </form>
    );
}
