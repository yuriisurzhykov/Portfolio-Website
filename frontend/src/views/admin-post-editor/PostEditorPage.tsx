"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import type { AdminPostDetail, PostStatus } from "@portfolio/backend";
import { BlockEditor } from "@/shared/ui/block-editor";
import { Button } from "@/shared/ui/button";
import { StatusToggle, type StatusToggleOption } from "@/shared/ui/status-toggle";
import type { RelatedItemOption } from "@/shared/ui/related-item-picker";
import { formatAdminDate } from "@/shared/lib/date-format";
import { ContentEditorWorkspace, EditorStatusBar, useWorkspacePanels } from "@/widgets/content-editor";
import { JournalProperties } from "@/features/edit-content-properties";
import { ContentUrlField } from "@/features/edit-content-url";
import {
    ContentActions,
    PublicationReviewDialog,
    ConfirmContentActionDialog,
    useContentActions,
} from "@/features/manage-content";
import { usePostEditorController } from "./model/usePostEditorController";
export interface PostEditorPageProps {
    initialPost?: AdminPostDetail;
    existingCategories: string[];
    workOptions: RelatedItemOption[];
}
const STATUS_OPTIONS: StatusToggleOption<PostStatus>[] = [
    { value: "published", label: "Published", tone: "success" },
    { value: "upcoming", label: "Upcoming", tone: "warning" },
];
export function PostEditorPage({ initialPost, existingCategories, workOptions }: PostEditorPageProps) {
    const router = useRouter();
    const { blockEditorRef, ...c } = usePostEditorController(initialPost);
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
            router.push("/admin/journal");
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
            if (slug) router.push(`/admin/journal/${encodeURIComponent(slug)}/${suffix}`);
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
                        kind="Journal"
                        title={c.form.title}
                        dateLabel={c.saved ? `Created ${formatAdminDate(c.saved.date)}` : undefined}
                        saveLabel={saveLabel}
                        saveFailed={saveFailed}
                        published={published}
                        hasUnpublishedChanges={hasChanges}
                        onBack={() => void actions.navigate(() => router.push("/admin/journal"))}
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
                    <JournalProperties
                        value={c.form}
                        onChange={c.update}
                        existingCategories={existingCategories}
                        workOptions={workOptions}
                        disabled={actions.busy}
                        errors={fieldErrors}
                        urlField={
                            <ContentUrlField
                                state={c.url}
                                section="journal"
                                onManualApply={c.manualUrl}
                                disabled={actions.busy}
                            />
                        }
                    />
                }
                body={
                    <>
                        <div className="border-b border-border-subtle px-lg py-md">
                            <h1 className="text-caption font-mono text-text-muted">Body</h1>
                        </div>
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

                        <p className="px-lg py-md text-caption text-text-muted">
                            Estimated reading time: {c.saved?.readMins ?? 0} min
                        </p>
                    </>
                }
                actions={
                    <ContentActions
                        published={published}
                        hasChanges={hasChanges}
                        hasResource={Boolean(c.url.canonicalSlug)}
                        busy={actions.busy}
                        onReview={() => void actions.reviewPublication()}
                        onPreview={() => actions.preview((slug) => `/journal/${encodeURIComponent(slug)}?preview=1`)}
                        onHistory={() => navigateTo("history")}
                        onTranslation={() => navigateTo("translate")}
                        onDiscard={() => actions.requestConfirmation("discard")}
                        onUnpublish={() => actions.requestConfirmation("unpublish")}
                        onDelete={() => actions.requestConfirmation("delete")}
                    >
                        <fieldset disabled={actions.busy} className="flex flex-col gap-md border-none p-none">
                            <legend className="mb-sm text-caption text-text-secondary">Post status</legend>
                            <StatusToggle
                                value={c.form.status}
                                options={STATUS_OPTIONS}
                                onChange={(status) => c.update("status", status)}
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
                url={`/journal/${c.url.draftSlug}`}
                published={published}
                summary={[
                    { label: "Category", value: c.form.category },
                    { label: "Excerpt", value: c.form.excerpt },
                    { label: "Post status", value: c.form.status },
                    { label: "Related work", value: c.form.relatedWorkSlug || "None" },
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
