"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import type { AdminWorkDetail, WorkStatus } from "@portfolio/backend";
import { BlockEditor } from "@/shared/ui/block-editor";
import { Button } from "@/shared/ui/button";
import { StatusToggle, type StatusToggleOption } from "@/shared/ui/status-toggle";
import type { RelatedItemOption } from "@/shared/ui/related-item-picker";
import { Checkbox } from "@/shared/ui/form";
import { ContentEditorWorkspace, EditorStatusBar, useWorkspacePanels } from "@/widgets/content-editor";
import { WorkProperties } from "@/features/edit-content-properties";
import { ContentUrlField } from "@/features/edit-content-url";
import {
    ContentActions,
    PublicationReviewDialog,
    ConfirmContentActionDialog,
    useContentActions,
} from "@/features/manage-content";
import { useWorkEditorController } from "./model/useWorkEditorController";
export interface WorkEditorPageProps {
    initialWork?: AdminWorkDetail;
    techStackSuggestions?: string[];
    postOptions?: RelatedItemOption[];
}
const STATUS_OPTIONS: StatusToggleOption<WorkStatus>[] = [
    { value: "shipped", label: "Shipped", tone: "success" },
    { value: "in-progress", label: "In progress", tone: "warning" },
];
export function WorkEditorPage({ initialWork, techStackSuggestions = [], postOptions = [] }: WorkEditorPageProps) {
    const router = useRouter();
    const { blockEditorRef, ...c } = useWorkEditorController(initialWork);
    const panels = useWorkspacePanels(blockEditorRef);
    const actions = useContentActions({
        flushDraft: c.flushDraft,
        getResourceSlug: c.autosave.getResourceSlug,
        getEditRevision: c.autosave.getEditRevision,
        validateForPublication: c.validateForPublication,
        publish: c.publish,
        unpublish: c.unpublish,
        discardDraft: c.discardDraft,
        deleteContent: c.deleteContent,
        onDeleted: () => {
            router.push("/admin/work");
            router.refresh();
        },
    });
    const published = c.saved?.lifecycleState === "PUBLISHED";
    const hasChanges = Boolean(c.saved?.hasUnpublishedChanges || c.autosave.isDirty);
    const saveFailed = c.autosave.status === "error";
    const saveLabel =
        c.autosave.status === "saving"
            ? "Saving draft…"
            : saveFailed
              ? "Save failed"
              : c.autosave.isDirty
                ? "Unsaved changes"
                : c.saved
                  ? "Draft saved"
                  : "Not saved yet";
    const error = actions.error || c.error;
    const fieldErrors = Object.fromEntries(actions.issues.map((issue) => [issue.field, issue.message]));
    function navigateTo(suffix: string) {
        void actions.navigate((slug) => {
            if (slug) router.push(`/admin/work/${encodeURIComponent(slug)}/${suffix}`);
        });
    }
    return (
        <div
            onBlur={() => {
                if (!actions.isBusy()) void c.flushDraft().catch(() => {});
            }}
        >
            <ContentEditorWorkspace
                {...panels}
                statusBar={
                    <EditorStatusBar
                        kind="Work"
                        title={c.form.title}
                        dateLabel={`Portfolio ${c.form.date}`}
                        saveLabel={saveLabel}
                        saveFailed={saveFailed}
                        published={published}
                        hasUnpublishedChanges={hasChanges}
                        onBack={() => void actions.navigate(() => router.push("/admin/work"))}
                    />
                }
                feedback={
                    error && (
                        <div
                            role="alert"
                            className="mx-lg my-md rounded-md border border-status-error p-md text-caption text-status-error"
                        >
                            {error}
                            {saveFailed && (
                                <Button
                                    className="ml-sm"
                                    appearance="flat"
                                    variant="secondary"
                                    disabled={actions.busy}
                                    onClick={() => void actions.retrySave()}
                                >
                                    Retry save
                                </Button>
                            )}
                        </div>
                    )
                }
                properties={
                    <WorkProperties
                        value={c.form}
                        onChange={(key, value) => c.updateProperties({ [key]: value })}
                        status={c.form.status}
                        techStackSuggestions={techStackSuggestions}
                        postOptions={postOptions}
                        disabled={actions.busy}
                        errors={fieldErrors}
                        urlField={
                            <ContentUrlField
                                state={c.url}
                                section="work"
                                onManualApply={c.manualUrl}
                                disabled={actions.busy}
                            />
                        }
                    />
                }
                body={
                    <>
                        <div className="border-b border-border-subtle px-lg py-md">
                            <h1 className="text-caption font-mono text-text-muted">Case study body</h1>
                        </div>
                        {c.form.hasCaseStudy ? (
                            <BlockEditor
                                key={c.contentVersion}
                                ref={blockEditorRef}
                                initialBlocks={c.initialBlocks}
                                onChange={c.bodyChanged}
                                appearance="authoring"
                                readOnly={actions.busy}
                                focusMode={panels.focusMode}
                                onFocusModeChange={panels.onFocusModeChange}
                            />
                        ) : (
                            <div className="mx-auto flex max-w-(--layout-content-reading) flex-col items-start gap-md p-2xl">
                                <h2 className="text-h2">Tell the story behind this project</h2>
                                <p className="text-body text-text-secondary">
                                    Add a case study when you are ready. Your project card can be published on its own.
                                </p>
                                <Button
                                    appearance="flat"
                                    disabled={actions.busy}
                                    onClick={() => c.update("hasCaseStudy", true)}
                                >
                                    Add case study
                                </Button>
                            </div>
                        )}
                    </>
                }
                actions={
                    <ContentActions
                        published={published}
                        hasChanges={hasChanges}
                        hasResource={Boolean(c.url.canonicalSlug)}
                        busy={actions.busy}
                        onReview={() => void actions.reviewPublication()}
                        onPreview={() => actions.preview((slug) => `/work/${encodeURIComponent(slug)}?preview=1`)}
                        onHistory={() => navigateTo("history")}
                        onTranslation={() => navigateTo("translate")}
                        onDiscard={() => actions.requestConfirmation("discard")}
                        onUnpublish={() => actions.requestConfirmation("unpublish")}
                        onDelete={() => actions.requestConfirmation("delete")}
                    >
                        <fieldset disabled={actions.busy} className="flex flex-col gap-md border-none p-none">
                            <legend className="mb-sm text-caption text-text-secondary">Project status</legend>
                            <StatusToggle
                                value={c.form.status}
                                options={STATUS_OPTIONS}
                                onChange={(status) => c.update("status", status)}
                            />
                            <Checkbox
                                label="Featured project"
                                checked={c.form.featured}
                                onChange={(event) => c.update("featured", event.target.checked)}
                            />
                        </fieldset>
                    </ContentActions>
                }
            />
            <PublicationReviewDialog
                open={actions.reviewOpen}
                onClose={actions.closeReview}
                onConfirm={() => void actions.confirmPublication()}
                busy={actions.busy}
                title={c.form.title}
                url={`/work/${c.url.draftSlug}`}
                published={published}
                summary={[
                    { label: "Summary", value: c.form.summary },
                    { label: "Portfolio date", value: c.form.date },
                    { label: "Project status", value: c.form.status },
                    { label: "Case study", value: c.form.hasCaseStudy ? "Included" : "Card only" },
                ]}
                issues={actions.issues}
                error={actions.error}
                onFix={() => {
                    actions.closeReview();
                    panels.onCompactPanelChange("details");
                }}
            />
            <ConfirmContentActionDialog
                action={actions.confirmation}
                onClose={actions.closeConfirmation}
                onConfirm={(action) => void actions.confirmAction(action)}
                busy={actions.busy}
                error={actions.error}
            />
        </div>
    );
}
