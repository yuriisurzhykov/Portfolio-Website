import type { ReactNode } from "react";

export type WorkspacePanel = "body" | "details" | "actions";
export interface ContentEditorWorkspaceProps {
    statusBar: ReactNode;
    feedback?: ReactNode;
    properties: ReactNode;
    body: ReactNode;
    actions: ReactNode;
    compactPanel: WorkspacePanel;
    onCompactPanelChange(panel: WorkspacePanel): void;
    focusMode: boolean;
    onFocusModeChange(enabled: boolean): void;
}
