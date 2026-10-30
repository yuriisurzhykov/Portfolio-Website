"use client";
import * as React from "react";
import type { BlockEditorHandle } from "@/shared/ui/block-editor";
import type { WorkspacePanel } from "./types";
/** Layout switches hide the canvas without rebuilding its document. */
export function useWorkspacePanels(editor: React.RefObject<BlockEditorHandle | null>) {
    const [compactPanel, setPanel] = React.useState<WorkspacePanel>("body");
    const [focusMode, setFocus] = React.useState(false);
    const selection = React.useRef<unknown>(null);
    function restore() {
        requestAnimationFrame(() => editor.current?.restoreSelection?.(selection.current));
    }
    function onCompactPanelChange(panel: WorkspacePanel) {
        if (compactPanel === "body") selection.current = editor.current?.captureSelection?.();
        setFocus(false);
        setPanel(panel);
        if (panel === "body") restore();
    }
    function onFocusModeChange(enabled: boolean) {
        selection.current = editor.current?.captureSelection?.();
        setFocus(enabled);
        setPanel("body");
        restore();
    }
    return { compactPanel, focusMode, onCompactPanelChange, onFocusModeChange };
}
