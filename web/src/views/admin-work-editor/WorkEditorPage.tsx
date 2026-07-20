"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { WorkDetail, WorkInput, WorkStatus } from "@portfolio/backend";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { Button } from "@/shared/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/shared/ui/form";
import { StatusToggle, type StatusToggleOption } from "@/shared/ui/status-toggle";
import { BlockEditor, type BlockEditorHandle } from "@/shared/ui/block-editor";
import { AdminApiError, adminApi } from "@/shared/lib/admin-api";
import { slugify } from "@/shared/lib/slugify";

export interface WorkEditorPageProps {
    /** Absent for "create new"; present (already-saved) for "edit". */
    initialWork?: WorkDetail;
}

const STATUS_OPTIONS: StatusToggleOption<WorkStatus>[] = [
    { value: "shipped", label: "Shipped", tone: "success" },
    { value: "in-progress", label: "In progress", tone: "warning" },
];

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
    // Same reasoning as `PostEditorPage`'s `slugTouched` — an existing
    // item's slug never follows title edits, only a brand new one's does,
    // and only until the admin edits the slug field directly.
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
            <div className="flex items-start justify-between gap-md flex-wrap">
                <div className="flex flex-col gap-sm">
                    <Text as="h1" variant="h3">{isEditing ? `Edit work: ${ initialWork?.slug }` : "New work item"}</Text>
                    <Text variant="caption" tone="faint" className="max-w-[52ch]">
                        A project or system in the <code className="font-mono">/work</code> portfolio ledger —
                        “what you built.” A journal post, by contrast, is a dated essay about it —
                        “what you wrote.” The two sections below map to the two things a visitor actually sees:
                        the card everyone gets, and an optional deep-dive page only some items have.
                    </Text>
                    <StatusToggle value={form.status} onChange={(status) => update("status", status)} options={STATUS_OPTIONS} />
                </div>
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
                <div className="flex flex-col gap-[2px]">
                    <Text as="h2" variant="h5">Portfolio card</Text>
                    <Text variant="caption" tone="faint">
                        Every work item gets one of these — on the <code className="font-mono">/work</code> ledger,
                        and (if “Featured” below) on the landing page’s “Selected Work” grid too.
                    </Text>
                </div>

                <Field label="Title" htmlFor="title" hint="Not localized — same value in both languages on the public site.">
                    <Input id="title" required value={form.title} onChange={(e) => updateTitle(e.target.value)} />
                </Field>
                <Field label="Slug" htmlFor="slug" hint="Auto-generated from the title — edit if you want a different URL.">
                    <Input id="slug" required value={form.slug} onChange={(e) => updateSlugManually(e.target.value)} />
                </Field>
                <Field label="Summary" htmlFor="summary" hint="One or two sentences — the blurb shown under the title on the card.">
                    <Textarea id="summary" required rows={2} value={form.summary} onChange={(e) => update("summary", e.target.value)} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                    <Field label="Year" htmlFor="year" hint="Used to sort the /work ledger, newest first.">
                        <Input id="year" type="number" required value={form.year} onChange={(e) => update("year", e.target.value)} />
                    </Field>
                    <Field label="Stack" htmlFor="stack" hint="Comma-separated, e.g. Kotlin, Jetpack Compose.">
                        <Input id="stack" value={form.stack} onChange={(e) => update("stack", e.target.value)} />
                    </Field>
                    <Field
                        label="Cover image"
                        htmlFor="coverImage"
                        hint={"Optional — only used on the landing page's \"Selected Work\" grid, not on the /work ledger itself."}
                    >
                        <Input id="coverImage" value={form.coverImage} onChange={(e) => update("coverImage", e.target.value)} />
                    </Field>
                    <div className="flex items-center">
                        <Checkbox
                            label="Featured on landing page"
                            hint={"Adds this item to the home page's \"Selected Work\" grid."}
                            checked={form.featured}
                            onChange={(e) => update("featured", e.target.checked)}
                        />
                    </div>
                </div>

                <Field
                    label="Related journal post"
                    htmlFor="relatedPostSlug"
                    hint={"Optional — the one journal entry that's the deepest write-up of this project. If this item has no case study below, clicking it takes visitors there instead."}
                >
                    <Input id="relatedPostSlug" value={form.relatedPostSlug} onChange={(e) => update("relatedPostSlug", e.target.value)} placeholder="e.g. flowbus" />
                </Field>
            </Card>

            <Card variant="filled" className="p-lg flex flex-col gap-md">
                <div className="flex flex-col gap-[2px]">
                    <Text as="h2" variant="h5">Case study (optional)</Text>
                    <Text variant="caption" tone="faint">
                        A full write-up page at <code className="font-mono">/work/{ form.slug || "…" }</code> — the
                        project’s own detail page, separate from the journal. Most items don’t need one; a plain
                        card above is often enough.
                    </Text>
                </div>

                <Checkbox
                    label="This item has a case study"
                    hint="Turns the card above into a clickable link to a full detail page. Leave off for a simple portfolio-list entry."
                    checked={form.hasCaseStudy}
                    onChange={(e) => update("hasCaseStudy", e.target.checked)}
                />

                {form.hasCaseStudy && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                            <Field label="Started" htmlFor="startedLabel" hint={"Free-text, e.g. \"Jan 2023\" — not an exact date."}>
                                <Input id="startedLabel" required value={form.startedLabel} onChange={(e) => update("startedLabel", e.target.value)} placeholder="e.g. Jan 2023" />
                            </Field>
                            <Field
                                label={form.status === "in-progress" ? "Target" : "Shipped"}
                                htmlFor="shippedLabel"
                                hint={form.status === "in-progress"
                                    ? "Free-text estimate, e.g. \"Q4 2026\" — shown as the target date while In progress."
                                    : "Free-text, e.g. \"Aug 2023\" — shown as the ship date."}
                            >
                                <Input id="shippedLabel" required value={form.shippedLabel} onChange={(e) => update("shippedLabel", e.target.value)} placeholder="e.g. Aug 2023" />
                            </Field>
                        </div>
                        <Field label="Role" htmlFor="role" hint={"Your role on the project, e.g. \"Sole engineer\" or \"Lead architect\" — shown in the case study's meta row."}>
                            <Input id="role" required value={form.role} onChange={(e) => update("role", e.target.value)} placeholder="e.g. Sole engineer" />
                        </Field>
                        <Field
                            label="Hero image"
                            htmlFor="heroImage"
                            hint="Optional — the large banner image at the top of THIS case study page. Different from the small Cover image above, which is only used on the landing page grid."
                        >
                            <Input id="heroImage" value={form.heroImage} onChange={(e) => update("heroImage", e.target.value)} />
                        </Field>

                        <div className="flex flex-col gap-sm mt-sm">
                            <div className="flex flex-col gap-[2px]">
                                <Text variant="h5" as="h2">Case study body</Text>
                                <Text variant="caption" tone="faint">
                                    The narrative itself — same block editor as a journal post’s body.
                                </Text>
                            </div>
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
