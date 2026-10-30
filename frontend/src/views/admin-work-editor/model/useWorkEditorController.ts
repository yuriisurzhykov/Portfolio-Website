"use client";
import * as React from "react";
import type { AdminWorkDetail, AdminWorkSummary, WorkInput } from "@portfolio/backend";
import { adminApi } from "@/shared/lib/admin-api";
import { todayIsoDate } from "@/shared/lib/date-format";
import { hasMeaningfulBlocks } from "@/shared/lib/has-meaningful-blocks";
import { useAutosaveDraft } from "@/shared/lib/use-autosave-draft";
import type { BlockEditorHandle } from "@/shared/ui/block-editor";
import { reduceUrlPolicy, type ContentUrlState } from "@/features/edit-content-url";
import type { WorkPropertiesValue } from "@/features/edit-content-properties";
import type { WorkEditorForm } from "./types";
import { workPublicationIssues } from "./publication-issues";

function initialForm(work?: AdminWorkDetail): WorkEditorForm {
    return {
        title: work?.title.en ?? "",
        summary: work?.summary.en ?? "",
        date: work?.date ?? todayIsoDate(),
        stack: work?.stack ?? [],
        coverImage: work?.coverImage ?? "",
        relatedPostSlug: work?.relatedPostSlug ?? "",
        status: work?.status ?? "in-progress",
        featured: work?.featured ?? false,
        hasCaseStudy: Boolean(work?.caseStudy),
        role: work?.caseStudy?.role.en ?? "",
        startedLabel: work?.caseStudy?.startedLabel.en ?? "",
        shippedLabel: work?.caseStudy?.shippedLabel.en ?? "",
        heroImage: work?.caseStudy?.heroImage ?? "",
    };
}
function initialUrl(work?: AdminWorkDetail): ContentUrlState {
    return {
        canonicalSlug: work?.slug ?? null,
        draftSlug: work?.draftSlug ?? work?.slug ?? "",
        mode: work?.urlMode ?? (work ? "manual" : "auto"),
        hasEverBeenPublished: Boolean(work?.publishedAt),
    };
}

/** Work owns its card/case-study payload; action sequencing and layout remain shared. */
export function useWorkEditorController(initialWork?: AdminWorkDetail) {
    const [form, setForm] = React.useState(() => initialForm(initialWork));
    const formRef = React.useRef(form);
    const [url, setUrl] = React.useState(() => initialUrl(initialWork));
    const urlRef = React.useRef(url);
    const [saved, setSaved] = React.useState<AdminWorkSummary | null>(initialWork ?? null);
    const [initialBlocks, setInitialBlocks] = React.useState(initialWork?.caseStudy?.blocks ?? []);
    const [contentVersion, setContentVersion] = React.useState(0);
    const [error, setError] = React.useState<string | null>(null);
    const blockEditorRef = React.useRef<BlockEditorHandle>(null);
    function changeUrl(next: ContentUrlState) {
        urlRef.current = next;
        setUrl(next);
    }
    function replaceAddress(slug: string) {
        window.history.replaceState(null, "", `/admin/work/${encodeURIComponent(slug)}/edit`);
    }
    function buildInput(): WorkInput {
        const value = formRef.current,
            address = urlRef.current;
        return {
            title: value.title.trim(),
            summary: value.summary.trim(),
            date: value.date,
            stack: value.stack.map((item) => item.trim()).filter(Boolean),
            status: value.status,
            featured: value.featured,
            coverImage: value.coverImage.trim() || null,
            relatedPostSlug: value.relatedPostSlug || null,
            urlMode: address.mode,
            slug: address.mode === "manual" ? address.draftSlug || undefined : undefined,
            caseStudy: value.hasCaseStudy
                ? {
                      role: value.role.trim(),
                      startedLabel: value.startedLabel.trim(),
                      shippedLabel: value.shippedLabel.trim(),
                      heroImage: value.heroImage.trim() || null,
                      blocks: blockEditorRef.current?.getBlocks() ?? initialBlocks,
                  }
                : null,
        };
    }
    const autosave = useAutosaveDraft<WorkInput, AdminWorkSummary>({
        slug: initialWork?.slug ?? null,
        buildInput,
        isEmpty: (input) =>
            !input.title &&
            !input.summary &&
            !input.stack.length &&
            !input.relatedPostSlug &&
            !input.coverImage &&
            !hasMeaningfulBlocks(input.caseStudy?.blocks ?? []) &&
            !input.slug,
        create: adminApi.createWork,
        update: adminApi.updateWork,
        getSlug: (result) => result.slug,
        onSlugChanged: (result) => replaceAddress(result.slug),
        onSaved: (result, input) => {
            setSaved(result);
            setError(null);
            const current = urlRef.current;
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
    function updateProperties(patch: Partial<WorkPropertiesValue>) {
        commit({ ...formRef.current, ...patch });
    }
    function update<K extends keyof WorkEditorForm>(key: K, value: WorkEditorForm[K]) {
        commit({ ...formRef.current, [key]: value });
    }
    function commit(next: WorkEditorForm) {
        if (formRef.current.hasCaseStudy && !next.hasCaseStudy) {
            next.startedLabel = "";
            next.shippedLabel = "";
            next.role = "";
            next.heroImage = "";
            setInitialBlocks([]);
            setContentVersion((version) => version + 1);
        }
        const titleChanged = next.title !== formRef.current.title;
        formRef.current = next;
        setForm(next);
        if (titleChanged) changeUrl(reduceUrlPolicy(urlRef.current, { type: "titleChanged", title: next.title }));
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
        const result = await adminApi.publishWork(slug());
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
        const result = await adminApi.unpublishWork(slug());
        setSaved((previous) => (previous ? { ...previous, ...result } : null));
    }
    async function discardDraft() {
        autosave.cancelScheduledSave();
        const fresh = await adminApi.discardWorkDraft(slug());
        const next = initialForm(fresh);
        formRef.current = next;
        setForm(next);
        changeUrl(initialUrl(fresh));
        setSaved(fresh);
        setInitialBlocks(fresh.caseStudy?.blocks ?? []);
        setContentVersion((version) => version + 1);
        autosave.resetSavedState();
        setError(null);
    }
    async function deleteContent() {
        autosave.cancelScheduledSave();
        await adminApi.deleteWork(slug());
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
        updateProperties,
        manualUrl,
        bodyChanged: autosave.scheduleSave,
        flushDraft,
        publish,
        unpublish,
        discardDraft,
        deleteContent,
        validateForPublication: () => workPublicationIssues(formRef.current, urlRef.current),
    };
}
