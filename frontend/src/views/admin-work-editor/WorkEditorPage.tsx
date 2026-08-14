"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { AdminWorkDetail, LifecycleState, WorkInput, WorkStatus, WorkSummary } from "@portfolio/backend";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { Button } from "@/shared/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/shared/ui/form";
import { StatusBadge } from "@/shared/ui/status-badge";
import { StatusToggle, type StatusToggleOption } from "@/shared/ui/status-toggle";
import { BlockEditor, type BlockEditorHandle } from "@/shared/ui/block-editor";
import { TokenCombobox } from "@/shared/ui/token-combobox";
import { RelatedItemPicker, type RelatedItemOption } from "@/shared/ui/related-item-picker";
import { AdminApiError, adminApi } from "@/shared/lib/admin-api";
import { slugify } from "@/shared/lib/slugify";
import { todayIsoDate } from "@/shared/lib/date-format";
import { type AutosaveStatus, useAutosaveDraft } from "@/shared/lib/use-autosave-draft";

export interface WorkEditorPageProps {
    /** Absent for "create new"; present (already-saved) for "edit". */
    initialWork?: AdminWorkDetail;
    /** `techStack[].name` from `SiteContent` — fuzzy-search suggestions for the Stack field's `TokenCombobox`, not a hard-enforced list (see `token-combobox/README.md` for why free text is still allowed). Defaults to `[]` so callers that don't have this yet (there are none today, but the type stays honest) don't crash. */
    techStackSuggestions?: string[];
    /** Every real Post, for `RelatedItemPicker`'s "Related journal post" field — same "hand the whole small list to the client" pattern as `techStackSuggestions`. Defaults to `[]` for the same reason. */
    postOptions?: RelatedItemOption[];
}

const STATUS_OPTIONS: StatusToggleOption<WorkStatus>[] = [
    { value: "shipped", label: "Shipped", tone: "success" },
    { value: "in-progress", label: "In progress", tone: "warning" },
];

interface FormState {
    slug: string;
    title: string;
    date: string;
    status: WorkStatus;
    summary: string;
    stack: string[];
    coverImage: string;
    featured: boolean;
    relatedPostSlug: string;
    hasCaseStudy: boolean;
    startedLabel: string;
    shippedLabel: string;
    role: string;
    heroImage: string;
}

/** Same shape/reasoning as `PostEditorPage`'s identical helper — see its comment. */
function autosaveStatusLabel(status: AutosaveStatus): string | null {
    switch (status) {
        case "saving":
            return "Saving draft…";
        case "saved":
            return "Draft saved just now";
        case "error":
            return "Save failed — retrying";
        case "idle":
            return null;
    }
}

/**
 * English-only title (`.en` — `Work.title` was localized 2026-08-11, same
 * shape as `Post.title`; translation happens on the separate "Add
 * translation" page, same as Post) — same reasoning as `PostEditorPage`'s
 * `toFormState`. `slug` reads `draftSlug` (the pending rename, if any), not
 * `slug` — same reasoning as `PostEditorPage`'s identical change, see
 * `AdminWorkDetail.draftSlug`'s comment. `status` defaults to
 * `"in-progress"`, not `"shipped"` — a brand new item is a DRAFT
 * (`lifecycleState`) until explicitly published.
 */
function toFormState(work?: AdminWorkDetail): FormState {
    return {
        slug: work?.draftSlug ?? work?.slug ?? "",
        title: work?.title.en ?? "",
        date: work?.date ?? todayIsoDate(),
        status: work?.status ?? "in-progress",
        summary: work?.summary.en ?? "",
        stack: work?.stack ?? [],
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

export function WorkEditorPage({ initialWork, techStackSuggestions = [], postOptions = [] }: WorkEditorPageProps) {
    const router = useRouter();
    const isEditing = Boolean(initialWork);

    // Same reasoning as `PostEditorPage`'s identical field — re-set
    // wholesale by "Discard changes"/"Load into draft", read for
    // everything the form doesn't itself own (case-study blocks, in
    // particular).
    const [work, setWork] = React.useState<AdminWorkDetail | undefined>(initialWork);
    const [form, setForm] = React.useState<FormState>(() => toFormState(initialWork));
    // Same reasoning as `PostEditorPage`'s `slugTouched` — an existing
    // item's slug never follows title edits, only a brand new one's does,
    // and only until the admin edits the slug field directly.
    const [slugTouched, setSlugTouched] = React.useState(isEditing);
    const blockEditorRef = React.useRef<BlockEditorHandle>(null);
    // Same reasoning as `PostEditorPage`'s identical field.
    const [contentVersion, setContentVersion] = React.useState(0);
    const [error, setError] = React.useState<string | null>(null);
    const [deleting, setDeleting] = React.useState(false);
    const [discarding, setDiscarding] = React.useState(false);
    const [previewPending, setPreviewPending] = React.useState(false);
    const [lifecycleState, setLifecycleState] = React.useState<LifecycleState>(initialWork?.lifecycleState ?? "DRAFT");
    const [lifecyclePending, setLifecyclePending] = React.useState(false);
    /** Same reasoning as `PostEditorPage`'s identical field. */
    const [hasUnpublishedChanges, setHasUnpublishedChanges] = React.useState(initialWork?.hasUnpublishedChanges ?? false);
    // Guards "Back to list"/"Add translation" — see `navigateAfterFlush` below.
    const [navPending, setNavPending] = React.useState(false);
    /** Same reasoning, same fix as `PostEditorPage.tsx`'s identical field — see its comment. */
    const [currentSlug, setCurrentSlug] = React.useState<string | null>(initialWork?.slug ?? null);

    /** Same hook, same reasoning as `PostEditorPage`'s identical field — see its comment and this slice's README. */
    const autosave = useAutosaveDraft<WorkInput, WorkSummary>({
        slug: initialWork?.slug ?? null,
        buildInput: () => ({
            slug: form.slug.trim() || undefined,
            title: form.title.trim(),
            date: form.date,
            status: form.status,
            summary: form.summary.trim(),
            // Already an array of trimmed, deduped-by-TokenCombobox tokens —
            // still `.filter(Boolean)` defensively at this boundary, same as
            // every other field here, rather than trusting the UI layer
            // never to hand back something empty.
            stack: form.stack.map((tech) => tech.trim()).filter(Boolean),
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
        }),
        isEmpty: (input) => input.title.trim().length === 0,
        create: (input) => adminApi.createWork(input),
        update: (slug, input) => adminApi.updateWork(slug, input),
        getSlug: (result) => result.slug,
        // Same reasoning as `PostEditorPage.tsx`'s identical field — fires ONLY for the initial create.
        onSlugChanged: (result) => {
            setCurrentSlug(result.slug);
            router.replace(`/admin/work/${ result.slug }/edit`);
        },
        onSaved: (result) => {
            setLifecycleState(result.lifecycleState);
            // Same reasoning as `PostEditorPage.tsx`'s identical check.
            if (currentSlug !== null) {
                setHasUnpublishedChanges(true);
            }
        },
        onError: (err) => setError(err instanceof AdminApiError ? err.message : "Something went wrong while saving. Retrying automatically…"),
    });

    function update<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
        autosave.scheduleSave();
    }

    function updateTitle(title: string) {
        setForm((prev) => ({
            ...prev,
            title,
            slug: slugTouched ? prev.slug : slugify(title),
        }));
        autosave.scheduleSave();
    }

    function updateSlugManually(slug: string) {
        setSlugTouched(true);
        update("slug", slug);
    }

    /** Same reasoning as `PostEditorPage.tsx`'s identical function — see its comment. */
    async function handlePublish() {
        if (!currentSlug) return;
        setError(null);
        setLifecyclePending(true);
        try {
            await autosave.flush();
        } catch {
            setError("Your latest changes couldn't be saved, so publishing was skipped. Check your connection and try again.");
            setLifecyclePending(false);
            return;
        }
        try {
            const result = await adminApi.publishWork(currentSlug);
            setLifecycleState(result.lifecycleState);
            setHasUnpublishedChanges(false);
            if (result.slug !== currentSlug) {
                setCurrentSlug(result.slug);
                router.replace(`/admin/work/${ result.slug }/edit`);
            }
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Failed to publish.");
        } finally {
            setLifecyclePending(false);
        }
    }

    async function handleUnpublish() {
        if (!currentSlug) return;
        setError(null);
        setLifecyclePending(true);
        try {
            const result = await adminApi.unpublishWork(currentSlug);
            setLifecycleState(result.lifecycleState);
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Failed to unpublish.");
        } finally {
            setLifecyclePending(false);
        }
    }

    /** Same reasoning, same fix as `PostEditorPage.tsx`'s identical function — see its comment on why this flushes before discarding. */
    async function handleDiscard() {
        if (!currentSlug) return;
        if (!window.confirm("Discard every unpublished change and go back to what's currently live?")) return;

        setError(null);
        setDiscarding(true);
        await autosave.flush().catch(() => {});
        try {
            const fresh = await adminApi.discardWorkDraft(currentSlug);
            setWork(fresh);
            setForm(toFormState(fresh));
            setSlugTouched(true);
            setLifecycleState(fresh.lifecycleState);
            setHasUnpublishedChanges(false);
            setContentVersion((v) => v + 1);
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Failed to discard changes.");
        } finally {
            setDiscarding(false);
        }
    }

    /** Same reasoning as `PostEditorPage.tsx`'s identical function. */
    async function handlePreview() {
        if (!currentSlug) return;
        setPreviewPending(true);
        await autosave.flush().catch(() => {});
        setPreviewPending(false);
        window.open(`/work/${ currentSlug }?preview=1`, "_blank", "noopener,noreferrer");
    }

    async function handleDelete() {
        if (!currentSlug) return;
        if (!window.confirm(`Delete "${ currentSlug }"? This can't be undone.`)) return;

        setDeleting(true);
        // See PostEditorPage.tsx's identical comment — avoids the background
        // blur-flush's `update()` landing on the server after this delete
        // already removed the row.
        await autosave.flush().catch(() => {});
        try {
            await adminApi.deleteWork(currentSlug);
            router.push("/admin/work");
            router.refresh();
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Failed to delete.");
            setDeleting(false);
        }
    }

    /** Same hook, same reasoning, same fix as `PostEditorPage.tsx`'s identical function — see its comment for why this flushes BEFORE navigating rather than relying on `useAutosaveDraft`'s own unmount cleanup. */
    async function navigateAfterFlush(path: string) {
        setError(null);
        setNavPending(true);
        try {
            await autosave.flush();
            router.push(path);
        } catch {
            setError("Your latest changes couldn't be saved yet — please try again before leaving this page.");
            setNavPending(false);
        }
    }

    const autosaveLabel = autosaveStatusLabel(autosave.status);

    /** See PostEditorPage.tsx's identical `flushOnBlur` comment — same reasoning, same fire-and-forget flush on any field (including the block editor) losing focus. */
    function flushOnBlur() {
        void autosave.flush().catch(() => {});
    }

    return (
        // See PostEditorPage.tsx's identical `onSubmit` comment — swallows the browser's implicit submit-on-Enter, there's no real submit action anymore.
        <form onSubmit={(e) => e.preventDefault()} onBlur={flushOnBlur} className="flex flex-col gap-lg pb-4xl">
            <div className="flex items-start justify-between gap-md flex-wrap">
                <div className="flex flex-col gap-sm">
                    <Text as="h1" variant="h3">{isEditing ? `Edit work: ${ currentSlug }` : "New work item"}</Text>
                    <Text variant="caption" tone="faint" className="max-w-[52ch]">
                        A project or system in the <code className="font-mono">/work</code> portfolio ledger —
                        “what you built.” A journal post, by contrast, is a dated essay about it —
                        “what you wrote.” The two sections below map to the two things a visitor actually sees:
                        the card everyone gets, and an optional deep-dive page only some items have.
                    </Text>
                    <div className="flex items-center gap-sm flex-wrap">
                        <StatusToggle value={form.status} onChange={(status) => update("status", status)} options={STATUS_OPTIONS} />
                        {autosaveLabel && (
                            <Text
                                variant="caption"
                                className={autosave.status === "error" ? "text-status-error" : "text-text-faint"}
                                role="status"
                            >
                                {autosaveLabel}
                            </Text>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-sm flex-wrap">
                    {isEditing && (
                        <>
                            <StatusBadge tone={lifecycleState === "PUBLISHED" ? "success" : "warning"} withDot>
                                {lifecycleState === "PUBLISHED" ? "Published" : "Draft"}
                            </StatusBadge>
                            {lifecycleState === "PUBLISHED" && hasUnpublishedChanges && (
                                <StatusBadge tone="warning">Unpublished changes</StatusBadge>
                            )}
                            <Button type="button" variant="secondary" size="sm" onClick={handlePublish} loading={lifecyclePending}>
                                {lifecycleState === "DRAFT" ? "Publish" : "Update"}
                            </Button>
                            {hasUnpublishedChanges && (
                                <Button type="button" variant="ghost" size="sm" onClick={handleDiscard} loading={discarding}>
                                    Discard changes
                                </Button>
                            )}
                            {lifecycleState === "PUBLISHED" && (
                                <Button type="button" variant="ghost" size="sm" onClick={handleUnpublish} loading={lifecyclePending}>
                                    Unpublish
                                </Button>
                            )}
                            <Button type="button" variant="ghost" size="sm" onClick={handlePreview} loading={previewPending}>
                                Preview
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => navigateAfterFlush(`/admin/work/${ currentSlug }/history`)}
                                loading={navPending}
                            >
                                History
                            </Button>
                        </>
                    )}
                    {isEditing && (
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => navigateAfterFlush(`/admin/work/${ currentSlug }/translate`)}
                            loading={navPending}
                        >
                            {work?.summary.ru ? "Edit translation" : "Add translation"}
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

                <Field label="Title" htmlFor="title">
                    <Input id="title" required value={form.title} onChange={(e) => updateTitle(e.target.value)} />
                </Field>
                <Field
                    label="Slug"
                    htmlFor="slug"
                    hint={
                        isEditing
                            ? `Auto-generated from the title — edit if you want a different URL. Currently live at /work/${ currentSlug }; a change here takes effect on Publish/Update.`
                            : "Auto-generated from the title — edit if you want a different URL."
                    }
                >
                    <Input id="slug" required value={form.slug} onChange={(e) => updateSlugManually(e.target.value)} />
                </Field>
                <Field label="Summary" htmlFor="summary" hint="One or two sentences — the blurb shown under the title on the card.">
                    <Textarea id="summary" required rows={2} value={form.summary} onChange={(e) => update("summary", e.target.value)} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                    <Field label="Date" htmlFor="date" hint="Used to sort the /work ledger, newest first — edit freely, unlike a journal post's date.">
                        <Input id="date" type="date" required value={form.date} onChange={(e) => update("date", e.target.value)} />
                    </Field>
                    <TokenCombobox
                        id="work-stack"
                        label="Stack"
                        hint="Press Enter to add. Pick a suggestion, or type your own — it doesn't have to already exist in Tech Stack."
                        values={form.stack}
                        onChange={(stack) => update("stack", stack)}
                        suggestions={techStackSuggestions}
                        placeholder="e.g. Kotlin"
                    />
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

                <RelatedItemPicker
                    id="relatedPostSlug"
                    label="Related journal post"
                    hint="Optional — the one journal entry that's the deepest write-up of this project. If this item has no case study below, clicking it takes visitors there instead."
                    value={form.relatedPostSlug || null}
                    onChange={(slug) => update("relatedPostSlug", slug ?? "")}
                    options={postOptions}
                    placeholder="Search journal posts…"
                />
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
                            <BlockEditor key={contentVersion} ref={blockEditorRef} initialBlocks={work?.caseStudy?.blocks ?? []} onChange={autosave.scheduleSave} />
                        </div>
                    </>
                )}
            </Card>

            {error && (
                <Text variant="caption" className="text-status-error" role="alert">{error}</Text>
            )}

            <div className="flex gap-sm">
                <Button type="button" variant="secondary" onClick={() => navigateAfterFlush("/admin/work")} loading={navPending}>
                    Back to list
                </Button>
            </div>
        </form>
    );
}
