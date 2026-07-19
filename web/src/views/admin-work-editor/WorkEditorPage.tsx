"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { WorkDetail, WorkInput, WorkStatus } from "@portfolio/backend";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { Button } from "@/shared/ui/button";
import { Checkbox, Field, Input, LocalizedInputField, LocalizedTextareaField, Select } from "@/shared/ui/form";
import { BlockListEditor, blockToDraft, draftToBlockInput, type DraftBlock } from "@/shared/ui/block-editor";
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
    summary: { en: string; ru: string };
    stack: string;
    coverImage: string;
    featured: boolean;
    relatedPostSlug: string;
    hasCaseStudy: boolean;
    startedLabel: { en: string; ru: string };
    shippedLabel: { en: string; ru: string };
    role: { en: string; ru: string };
    heroImage: string;
}

function toFormState(work?: WorkDetail): FormState {
    return {
        slug: work?.slug ?? "",
        title: work?.title ?? "",
        year: work ? String(work.year) : String(new Date().getFullYear()),
        status: work?.status ?? "shipped",
        summary: work?.summary ?? { en: "", ru: "" },
        stack: work?.stack.join(", ") ?? "",
        coverImage: work?.coverImage ?? "",
        featured: work?.featured ?? false,
        relatedPostSlug: work?.relatedPostSlug ?? "",
        hasCaseStudy: Boolean(work?.caseStudy),
        startedLabel: work?.caseStudy?.startedLabel ?? { en: "", ru: "" },
        shippedLabel: work?.caseStudy?.shippedLabel ?? { en: "", ru: "" },
        role: work?.caseStudy?.role ?? { en: "", ru: "" },
        heroImage: work?.caseStudy?.heroImage ?? "",
    };
}

export function WorkEditorPage({ initialWork }: WorkEditorPageProps) {
    const router = useRouter();
    const isEditing = Boolean(initialWork);

    const [form, setForm] = React.useState<FormState>(() => toFormState(initialWork));
    const [blocks, setBlocks] = React.useState<DraftBlock[]>(() => (initialWork?.caseStudy?.blocks ?? []).map(blockToDraft));
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
            summary: form.summary,
            stack: form.stack.split(",").map((s) => s.trim()).filter(Boolean),
            coverImage: form.coverImage.trim() || null,
            featured: form.featured,
            relatedPostSlug: form.relatedPostSlug.trim() || null,
            caseStudy: form.hasCaseStudy
                ? {
                    startedLabel: form.startedLabel,
                    shippedLabel: form.shippedLabel,
                    role: form.role,
                    heroImage: form.heroImage.trim() || null,
                    blocks: blocks.map(draftToBlockInput),
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

                <LocalizedTextareaField label="Summary" value={form.summary} onChange={(summary) => update("summary", summary)} rows={2} required />
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
                            <LocalizedInputField label="Started" value={form.startedLabel} onChange={(v) => update("startedLabel", v)} required />
                            <LocalizedInputField label="Shipped" value={form.shippedLabel} onChange={(v) => update("shippedLabel", v)} required />
                        </div>
                        <LocalizedInputField label="Role" value={form.role} onChange={(v) => update("role", v)} required />
                        <Field label="Hero image" htmlFor="heroImage" hint="Optional — large case-study detail page image.">
                            <Input id="heroImage" value={form.heroImage} onChange={(e) => update("heroImage", e.target.value)} />
                        </Field>

                        <div className="flex flex-col gap-sm mt-sm">
                            <Text variant="h5" as="h2">Case study body</Text>
                            <BlockListEditor blocks={blocks} onChange={setBlocks} />
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
