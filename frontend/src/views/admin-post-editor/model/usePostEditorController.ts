"use client";
import * as React from "react";
import type { AdminPostDetail, AdminPostSummary, PostInput } from "@portfolio/backend";
import { adminApi } from "@/shared/lib/admin-api";
import { hasMeaningfulBlocks } from "@/shared/lib/has-meaningful-blocks";
import { useAutosaveDraft } from "@/shared/lib/use-autosave-draft";
import type { BlockEditorHandle } from "@/shared/ui/block-editor";
import { reduceUrlPolicy, type ContentUrlState } from "@/features/edit-content-url";
import type { PostEditorForm } from "./types";
import { postPublicationIssues } from "./publication-issues";

function initialForm(post?: AdminPostDetail): PostEditorForm {
    return {
        title: post?.title.en ?? "",
        category: post?.category.en ?? "",
        excerpt: post?.excerpt.en ?? "",
        relatedWorkSlug: post?.relatedWorkSlug ?? "",
        status: post?.status ?? "upcoming",
    };
}
function initialUrl(post?: AdminPostDetail): ContentUrlState {
    return {
        canonicalSlug: post?.slug ?? null,
        draftSlug: post?.draftSlug ?? post?.slug ?? "",
        mode: post?.urlMode ?? (post ? "manual" : "auto"),
        hasEverBeenPublished: Boolean(post?.publishedAt),
    };
}

/** Journal state and API adaptation stay explicit; the shared action feature owns sequencing. */
export function usePostEditorController(initialPost?: AdminPostDetail) {
    const [form, setForm] = React.useState(() => initialForm(initialPost));
    const formRef = React.useRef(form);
    const [url, setUrl] = React.useState(() => initialUrl(initialPost));
    const urlRef = React.useRef(url);
    const [saved, setSaved] = React.useState<AdminPostSummary | null>(initialPost ?? null);
    const [initialBlocks, setInitialBlocks] = React.useState(initialPost?.blocks ?? []);
    const [contentVersion, setContentVersion] = React.useState(0);
    const [error, setError] = React.useState<string | null>(null);
    const blockEditorRef = React.useRef<BlockEditorHandle>(null);

    function changeUrl(next: ContentUrlState) {
        urlRef.current = next;
        setUrl(next);
    }
    function replaceAddress(slug: string) {
        window.history.replaceState(null, "", `/admin/journal/${encodeURIComponent(slug)}/edit`);
    }
    function buildInput(): PostInput {
        const value = formRef.current,
            address = urlRef.current;
        return {
            title: value.title.trim(),
            category: value.category.trim(),
            excerpt: value.excerpt.trim(),
            status: value.status,
            relatedWorkSlug: value.relatedWorkSlug || null,
            blocks: blockEditorRef.current?.getBlocks() ?? initialBlocks,
            urlMode: address.mode,
            slug: address.mode === "manual" ? address.draftSlug || undefined : undefined,
        };
    }
    const autosave = useAutosaveDraft<PostInput, AdminPostSummary>({
        slug: initialPost?.slug ?? null,
        buildInput,
        isEmpty: (input) =>
            !input.title &&
            !input.category &&
            !input.excerpt &&
            !input.relatedWorkSlug &&
            !hasMeaningfulBlocks(input.blocks) &&
            !input.slug,
        create: adminApi.createPost,
        update: adminApi.updatePost,
        getSlug: (result) => result.slug,
        onSlugChanged: (result) => replaceAddress(result.slug),
        onSaved: (result, input) => {
            setSaved(result);
            setError(null);
            const current = urlRef.current;
            // Acknowledging an older save must not erase a newer title or manual URL edit.
            const sameInput =
                formRef.current.title.trim() === input.title &&
                current.mode === input.urlMode &&
                (current.mode === "auto" || current.draftSlug === input.slug);
            changeUrl({
                ...current,
                canonicalSlug: result.slug,
                hasEverBeenPublished: Boolean(result.publishedAt),
                ...(sameInput ? { draftSlug: result.draftSlug, mode: result.urlMode } : {}),
            });
        },
        onError: (cause) => setError(cause instanceof Error ? cause.message : "Unable to save the draft."),
    });

    function update<K extends keyof PostEditorForm>(key: K, value: PostEditorForm[K]) {
        const next = { ...formRef.current, [key]: value };
        formRef.current = next;
        setForm(next);
        if (key === "title") changeUrl(reduceUrlPolicy(urlRef.current, { type: "titleChanged", title: next.title }));
        autosave.scheduleSave();
    }
    function manualUrl(slug: string) {
        changeUrl(reduceUrlPolicy(urlRef.current, { type: "manualApplied", slug }));
        autosave.scheduleSave();
    }
    async function flushDraft() {
        if (autosave.getIsDirty()) await autosave.flush();
    }
    function slug() {
        const value = autosave.getResourceSlug();
        if (!value) throw new Error("Write and save a draft before continuing.");
        return value;
    }
    async function publish() {
        const result = await adminApi.publishPost(slug());
        autosave.adoptResourceSlug(result.slug);
        autosave.resetSavedState();
        setSaved(result);
        setError(null);
        changeUrl({
            canonicalSlug: result.slug,
            draftSlug: result.draftSlug,
            mode: result.urlMode,
            hasEverBeenPublished: true,
        });
        replaceAddress(result.slug);
    }
    async function unpublish() {
        const result = await adminApi.unpublishPost(slug());
        setSaved((previous) => (previous ? { ...previous, ...result } : null));
    }
    async function discardDraft() {
        autosave.cancelScheduledSave();
        const fresh = await adminApi.discardPostDraft(slug());
        const next = initialForm(fresh);
        formRef.current = next;
        setForm(next);
        changeUrl(initialUrl(fresh));
        setSaved(fresh);
        setInitialBlocks(fresh.blocks);
        setContentVersion((value) => value + 1);
        autosave.resetSavedState();
        setError(null);
    }
    async function deleteContent() {
        autosave.cancelScheduledSave();
        await adminApi.deletePost(slug());
    }
    return {
        form,
        url,
        saved,
        initialBlocks,
        contentVersion,
        error,
        setError,
        blockEditorRef,
        autosave,
        buildInput,
        update,
        manualUrl,
        bodyChanged: autosave.scheduleSave,
        flushDraft,
        publish,
        unpublish,
        discardDraft,
        deleteContent,
        validateForPublication: () => postPublicationIssues(formRef.current, urlRef.current),
    };
}
