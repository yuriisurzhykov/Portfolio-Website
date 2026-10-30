"use client";

import type { ContentEditorWorkspaceProps } from "../model/types";
import { WorkspacePanelNavigation } from "./WorkspacePanelNavigation";
import "./content-editor.css";

/** Stable slots preserve BlockNote's document, selection and undo stack across layouts. */
export function ContentEditorWorkspace({
    statusBar,
    feedback,
    properties,
    body,
    actions,
    compactPanel,
    onCompactPanelChange,
    focusMode,
}: ContentEditorWorkspaceProps) {
    return (
        <div className="content-editor-workspace" data-focus={focusMode}>
            {statusBar}
            {feedback}
            <div className="content-editor-columns">
                <aside
                    aria-label="Content properties"
                    className="workspace-region workspace-properties"
                    data-region="details"
                    data-active={compactPanel === "details"}
                >
                    {properties}
                </aside>
                <main
                    aria-label="Writing canvas"
                    className="workspace-region workspace-body"
                    data-region="body"
                    data-active={compactPanel === "body"}
                >
                    {body}
                </main>
                <aside
                    aria-label="Content actions"
                    className="workspace-region workspace-actions"
                    data-region="actions"
                    data-active={compactPanel === "actions"}
                >
                    {actions}
                </aside>
            </div>
            <WorkspacePanelNavigation active={compactPanel} onChange={onCompactPanelChange} />
        </div>
    );
}
