"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { AdminPostDetail, LifecycleState, PostInput, PostStatus, PostSummary } from "@portfolio/backend";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { Button } from "@/shared/ui/button";
import { Field, Input, Textarea } from "@/shared/ui/form";
import { Tag } from "@/shared/ui/tag";
import { StatusBadge } from "@/shared/ui/status-badge";
import { StatusToggle, type StatusToggleOption } from "@/shared/ui/status-toggle";
import { BlockEditor, type BlockEditorHandle } from "@/shared/ui/block-editor";
import { AdminApiError, adminApi } from "@/shared/lib/admin-api";
import { slugify } from "@/shared/lib/slugify";
import { formatAdminDate, todayIsoDate } from "@/shared/lib/date-format";
import { type AutosaveStatus, useAutosaveDraft } from "@/shared/lib/use-autosave-draft";

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
    excerpt: string;
    status: PostStatus;
    relatedWorkSlug: string;
}

const STATUS_OPTIONS: StatusToggleOption<PostStatus>[] = [
    { value: "published", label: "Published", tone: "success" },
    { value: "upcoming", label: "Upcoming", tone: "warning" },
];

/** `null` (not a fallback string) when there's genuinely nothing to say yet — the header renders nothing at all for "idle" rather than an empty status line. "Draft saved", not just "Saved" — see this slice's README: autosave now ONLY ever writes a pending draft, never the live post, and the label has to say so, or an admin editing an already-published post could reasonably read "Saved" as "readers can see this now." */
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
 * English-only — see README. `status` defaults to `"upcoming"`, not
 * `"published"`, since a new post starts as a DRAFT anyway. `slug` reads
 * `draftSlug` (the pending rename, if any), not `slug` (always the live,
 * routing-stable value) — see `AdminPostDetail.draftSlug`'s own comment;
 * the form field is where a PENDING rename lives until Publish/Update.
 */
function toFormState(post?: AdminPostDetail): FormState {
    return {
        slug: post?.draftSlug ?? post?.slug ?? "",
        title: post?.title.en ?? "",
        category: post?.category.en ?? "",
        excerpt: post?.excerpt.en ?? "",
        status: post?.status ?? "upcoming",
        relatedWorkSlug: post?.relatedWorkSlug ?? "",
    };
}

export function PostEditorPage({ initialPost, existingCategories }: PostEditorPageProps) {
    const router = useRouter();
    const isEditing = Boolean(initialPost);

    // Holds whatever the editor is currently showing — re-set wholesale by
    // "Discard changes"/"Load into draft" (both replace it with a freshly
    // fetched `AdminPostDetail`), NOT by ordinary autosave (which only
    // ever returns a `PostSummary`, no `blocks`/`draftSlug` — see
    // `buildInput`/`onSaved` below). `date`/`readMins` in the header read
    // THIS, not `initialPost`, so they stay accurate after a discard/restore.
    const [post, setPost] = React.useState<AdminPostDetail | undefined>(initialPost);
    const [form, setForm] = React.useState<FormState>(() => toFormState(initialPost));
    // Only a NEW post's slug follows the title — an existing post already
    // has a real, possibly-linked-to URL; retitling it must never silently
    // change that. `useState(isEditing)`: for an existing post this starts
    // (and stays) "touched" from the very first render, for a new one it
    // starts "untouched" so the very first keystroke in Title already
    // fills Slug, without the admin having typed a slug themselves first.
    const [slugTouched, setSlugTouched] = React.useState(isEditing);
    const blockEditorRef = React.useRef<BlockEditorHandle>(null);
    // Bumped on "Discard changes"/"Load into draft" — forces `<BlockEditor>`
    // to remount and re-read `initialBlocks` from the freshly loaded
    // content; see block-editor/README.md's "`ref.getBlocks()`, not
    // `value`/`onChange`" — it only ever reads its `initialBlocks` prop
    // ONCE, at mount, so swapping the underlying content otherwise
    // wouldn't visibly change anything already on screen.
    const [contentVersion, setContentVersion] = React.useState(0);
    const [error, setError] = React.useState<string | null>(null);
    const [deleting, setDeleting] = React.useState(false);
    const [discarding, setDiscarding] = React.useState(false);
    const [previewPending, setPreviewPending] = React.useState(false);
    const [lifecycleState, setLifecycleState] = React.useState<LifecycleState>(initialPost?.lifecycleState ?? "DRAFT");
    const [lifecyclePending, setLifecyclePending] = React.useState(false);
    // Whether a `ContentDraft` row exists for this post right now — i.e.
    // Publish/Update would change something. Distinct from `lifecycleState`:
    // a post can be PUBLISHED with no pending changes (nothing to show),
    // PUBLISHED with pending changes (the case this flag exists to surface
    // — see the header badge below), or DRAFT (this flag barely matters,
    // the whole post is unpublished either way).
    const [hasUnpublishedChanges, setHasUnpublishedChanges] = React.useState(initialPost?.hasUnpublishedChanges ?? false);
    // Guards "Back to list"/"Add translation" — see `navigateAfterFlush` below.
    const [navPending, setNavPending] = React.useState(false);
    // The slug every action below actually targets — ALWAYS the LIVE,
    // routing-stable slug (`AdminPostDetail.slug`, never `draftSlug`): a
    // rename typed into the Slug field is pending, not applied, until
    // Publish/Update, so the API endpoint (and this page's own URL) must
    // keep addressing the post by its old slug until then.
    const [currentSlug, setCurrentSlug] = React.useState<string | null>(initialPost?.slug ?? null);

    // See `shared/lib/use-autosave-draft.ts` and this slice's README.
    const autosave = useAutosaveDraft<PostInput, PostSummary>({
        slug: initialPost?.slug ?? null,
        buildInput: () => ({
            slug: form.slug.trim() || undefined,
            title: form.title.trim(),
            category: form.category.trim(),
            excerpt: form.excerpt.trim(),
            status: form.status,
            relatedWorkSlug: form.relatedWorkSlug.trim() || null,
            blocks: blockEditorRef.current?.getBlocks() ?? [],
        }),
        isEmpty: (input) => input.title.trim().length === 0,
        create: (input) => adminApi.createPost(input),
        update: (slug, input) => adminApi.updatePost(slug, input),
        getSlug: (result) => result.slug,
        // Fires on the initial create ONLY — a rename typed into the form
        // after that point is a PENDING draft edit (`savePostDraft` always
        // returns the LIVE slug, unchanged, see admin-posts.ts), so this
        // never fires again for the same post until an actual Publish/Update
        // applies the rename.
        onSlugChanged: (result) => {
            setCurrentSlug(result.slug);
            router.replace(`/admin/journal/${ result.slug }/edit`);
        },
        onSaved: (result) => {
            setLifecycleState(result.lifecycleState);
            // `currentSlug` here is the value from THIS render's closure —
            // still `null` for the very first (create) save, non-null for
            // every save after. `createPost` never creates a `ContentDraft`
            // row (see its own comment), so the first save must not claim
            // one exists.
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

    /**
     * The single Publish/Update button — `DRAFT → PUBLISHED` for a post
     * that's never been public, or "apply the pending draft to the live
     * site" for one that already is (same endpoint either way, see
     * `publishPost`'s comment in admin-posts.ts). Flushes first because
     * publish reads whatever's ALREADY saved as a draft — any edit still
     * sitting in the debounce window has to land in the draft before this
     * applies it.
     */
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
            const result = await adminApi.publishPost(currentSlug);
            setLifecycleState(result.lifecycleState);
            setHasUnpublishedChanges(false);
            // A pending rename just took effect — the old edit URL no
            // longer resolves (`getPostForAdmin` looks up by the NEW live
            // slug now), so this page has to follow it.
            if (result.slug !== currentSlug) {
                setCurrentSlug(result.slug);
                router.replace(`/admin/journal/${ result.slug }/edit`);
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
            const result = await adminApi.unpublishPost(currentSlug);
            setLifecycleState(result.lifecycleState);
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Failed to unpublish.");
        } finally {
            setLifecyclePending(false);
        }
    }

    /**
     * "Discard changes" — throws away the pending draft and reverts this
     * page's whole form/body back to whatever's currently live. Does NOT
     * flush first — flushing would just save the very content this button
     * exists to discard, for no benefit (the discard removes the
     * `ContentDraft` row outright, whatever it currently holds).
     */
    async function handleDiscard() {
        if (!currentSlug) return;
        if (!window.confirm("Discard every unpublished change and go back to what's currently live?")) return;

        setError(null);
        setDiscarding(true);
        try {
            const fresh = await adminApi.discardPostDraft(currentSlug);
            setPost(fresh);
            setForm(toFormState(fresh));
            setSlugTouched(true); // the reverted slug is a real, live one — never re-derive it from the title again
            setLifecycleState(fresh.lifecycleState);
            setHasUnpublishedChanges(false);
            setContentVersion((v) => v + 1);
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Failed to discard changes.");
        } finally {
            setDiscarding(false);
        }
    }

    /**
     * Opens the public preview (`/journal/[slug]?preview=1`, see
     * `(site)/journal/[slug]/page.tsx`) in a new tab — the exact page a
     * real reader would eventually see, rendering the CURRENT draft
     * instead of the live content. Best-effort flush first (narrows, but
     * doesn't guarantee closing, the window where a very-latest keystroke
     * isn't reflected yet) — not gated on it succeeding, since a slightly
     * stale preview is still useful and far better than none.
     */
    async function handlePreview() {
        if (!currentSlug) return;
        setPreviewPending(true);
        await autosave.flush().catch(() => {});
        setPreviewPending(false);
        window.open(`/journal/${ currentSlug }?preview=1`, "_blank", "noopener,noreferrer");
    }

    async function handleDelete() {
        if (!currentSlug) return;
        if (!window.confirm(`Delete "${ currentSlug }"? This can't be undone.`)) return;

        setDeleting(true);
        // Clicking "Delete" blurs whatever field had focus, which fires the
        // form's own `onBlur` flush in the background — without waiting for
        // it here first, that flush's `update()` could land on the server
        // AFTER this delete already removed the row (a 404, swallowed
        // silently by its own `.catch`, but still a real race). Not gated on
        // success — there's nothing left worth saving once the record is
        // gone, so a failed flush shouldn't block the delete.
        await autosave.flush().catch(() => {});
        try {
            await adminApi.deletePost(currentSlug);
            router.push("/admin/journal");
            router.refresh();
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Failed to delete.");
            setDeleting(false);
        }
    }

    /** Every button that navigates away must flush through here first — see README for why this lives here and not in the hook's unmount cleanup. */
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

    /**
     * Fires on blur of ANY field in the form, including the embedded
     * `<BlockEditor>` — React's `onBlur` is implemented via the native
     * `focusout` event, which bubbles, so one handler here catches every
     * field/block losing focus without wiring each one individually. Not
     * awaited/surfaced to the user (unlike `handlePublish`/
     * `navigateAfterFlush`'s explicit `await autosave.flush()`) — this
     * isn't a deliberate action to gate on, and a failure here still
     * retries automatically via the hook's own retry timer.
     */
    function flushOnBlur() {
        void autosave.flush().catch(() => {});
    }

    return (
        // `onSubmit` only exists to swallow the browser's own implicit
        // submit-on-Enter (a `<form>` with a single text input submits on
        // Enter even with no submit button) — there is no explicit submit
        // action anymore, every field saves itself via autosave.
        <form onSubmit={(e) => e.preventDefault()} onBlur={flushOnBlur} className="flex flex-col gap-lg pb-4xl">
            <div className="flex items-start justify-between gap-md flex-wrap">
                <div className="flex flex-col gap-sm">
                    <Text as="h1" variant="h3">{isEditing ? `Edit post: ${ currentSlug }` : "New post"}</Text>
                    <div className="flex items-center gap-sm flex-wrap">
                        <StatusToggle value={form.status} onChange={(status) => update("status", status)} options={STATUS_OPTIONS} />
                        <Text variant="caption" tone="faint" className="font-mono">
                            {isEditing
                                ? `Created ${ formatAdminDate(post!.date) }`
                                : `Will be dated ${ formatAdminDate(todayIsoDate()) } — set automatically on save`}
                        </Text>
                        <Text variant="caption" tone="faint" className="font-mono" title="Estimated automatically from the body's word count — recalculated on every publish, not editable here.">
                            {isEditing
                                ? `~${ post!.readMins } min read`
                                : "Read time — estimated automatically on save"}
                        </Text>
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
                                onClick={() => navigateAfterFlush(`/admin/journal/${ currentSlug }/history`)}
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
                            onClick={() => navigateAfterFlush(`/admin/journal/${ currentSlug }/translate`)}
                            loading={navPending}
                        >
                            {post?.title.ru ? "Edit translation" : "Add translation"}
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
                <Field
                    label="Slug"
                    htmlFor="slug"
                    hint={
                        isEditing
                            ? `Auto-generated from the title — edit if you want a different URL. Currently live at /journal/${ currentSlug }; a change here takes effect on Publish/Update.`
                            : "Auto-generated from the title — edit if you want a different URL."
                    }
                >
                    <Input id="slug" required value={form.slug} onChange={(e) => updateSlugManually(e.target.value)} />
                </Field>

                <Field label="Related work slug" htmlFor="relatedWorkSlug" hint="Optional — links this post to a work item.">
                    <Input id="relatedWorkSlug" value={form.relatedWorkSlug} onChange={(e) => update("relatedWorkSlug", e.target.value)} />
                </Field>

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
                <BlockEditor key={contentVersion} ref={blockEditorRef} initialBlocks={post?.blocks ?? []} onChange={autosave.scheduleSave} />
            </div>

            {error && (
                <Text variant="caption" className="text-status-error" role="alert">{error}</Text>
            )}

            <div className="flex gap-sm">
                <Button type="button" variant="secondary" onClick={() => navigateAfterFlush("/admin/journal")} loading={navPending}>
                    Back to list
                </Button>
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
