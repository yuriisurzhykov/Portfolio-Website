import { Bold, Italic, Link, Code2, Plus, Maximize2 } from "lucide-react";
import { Button } from "@/shared/ui/button";

export type EditorCommand = "bold" | "italic" | "link" | "code" | "insert" | "paragraph" | "heading2" | "heading3";
export interface EditorToolbarProps {
    onCommand(command: EditorCommand): void;
    readOnly?: boolean;
    canChangeBlockType?: boolean;
    blockType?: "paragraph" | "heading2" | "heading3" | "custom";
    focusMode: boolean;
    onFocusModeChange(enabled: boolean): void;
    activeStyles?: { bold: boolean; italic: boolean };
}
export function EditorToolbar({
    onCommand,
    readOnly,
    canChangeBlockType = true,
    blockType = "paragraph",
    focusMode,
    onFocusModeChange,
    activeStyles,
}: EditorToolbarProps) {
    return (
        <div
            role="toolbar"
            aria-label="Body formatting"
            className="sticky top-0 z-content flex flex-wrap items-center gap-xs border-b border-border-subtle bg-bg-app px-md py-sm"
            onMouseDown={(event) => {
                if ((event.target as HTMLElement).closest("button")) event.preventDefault();
            }}
        >
            <select
                aria-label="Block type"
                disabled={readOnly || !canChangeBlockType}
                value={blockType}
                onChange={(event) => onCommand(event.target.value as EditorCommand)}
                className="rounded-md bg-bg-app px-sm py-xs text-caption text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-border-highlight"
            >
                {blockType === "custom" && <option value="custom">Custom block</option>}
                <option value="paragraph">Text</option>
                <option value="heading2">Heading 2</option>
                <option value="heading3">Heading 3</option>
            </select>
            <Button
                appearance="flat"
                size="sm"
                variant="ghost"
                aria-label="Bold"
                aria-pressed={activeStyles?.bold ?? false}
                disabled={readOnly}
                onClick={() => onCommand("bold")}
                iconLeft={<Bold className="size-md" aria-hidden="true" />}
            />
            <Button
                appearance="flat"
                size="sm"
                variant="ghost"
                aria-label="Italic"
                aria-pressed={activeStyles?.italic ?? false}
                disabled={readOnly}
                onClick={() => onCommand("italic")}
                iconLeft={<Italic className="size-md" aria-hidden="true" />}
            />
            <Button
                appearance="flat"
                size="sm"
                variant="ghost"
                aria-label="Insert link"
                disabled={readOnly}
                onClick={() => onCommand("link")}
                iconLeft={<Link className="size-md" aria-hidden="true" />}
            >
                Link
            </Button>
            <Button
                appearance="flat"
                size="sm"
                variant="ghost"
                aria-label="Insert code block"
                disabled={readOnly}
                onClick={() => onCommand("code")}
                iconLeft={<Code2 className="size-md" aria-hidden="true" />}
            >
                Code
            </Button>
            <span className="flex-1" />
            <Button
                appearance="flat"
                size="sm"
                variant="secondary"
                aria-label="Insert block"
                disabled={readOnly}
                onClick={() => onCommand("insert")}
                iconLeft={<Plus className="size-md" aria-hidden="true" />}
            >
                Insert
            </Button>
            <Button
                appearance="flat"
                size="sm"
                variant="ghost"
                disabled={readOnly}
                onClick={() => onFocusModeChange(!focusMode)}
                iconLeft={<Maximize2 className="size-md" aria-hidden="true" />}
            >
                {focusMode ? "Exit focus" : "Focus"}
            </Button>
        </div>
    );
}
