"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import * as React from "react";
import { filterSuggestionItems, SuggestionMenu } from "@blocknote/core";
import { useCreateBlockNote, SuggestionMenuController } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Block, BlockInput } from "@portfolio/backend";
import { useTheme } from "@/shared/theme";
import { blockNoteSchema } from "./schema";
import { blocksToPartialBlocks, editorBlocksToBlockInputs } from "./convert";
import { getSlashMenuItems } from "./slash-menu";
import { smartPasteHandler } from "./paste-handler";
import { fenceShortcutExtension } from "./fence-shortcut";
import { EditorToolbar, type EditorCommand } from "./EditorToolbar";
import { Dialog } from "@/shared/ui/dialog";
import { Field, Input } from "@/shared/ui/form";
import { Button } from "@/shared/ui/button";
import "./block-editor.css";

export interface BlockEditorHandle {
    /** Serializes the editor's current document to `BlockInput[]` — called at submit time (`PostEditorPage`/`WorkEditorPage`/the translate pages), not on every keystroke; BlockNote owns its own live document state between mount and submit, this component is deliberately NOT a controlled `value`/`onChange` input like the old `BlockListEditor`. */
    getBlocks: () => BlockInput[];
    focus?: () => void;
    captureSelection?: () => unknown;
    restoreSelection?: (snapshot: unknown) => void;
}

export interface BlockEditorProps {
    appearance?: "default" | "authoring";
    readOnly?: boolean;
    focusMode?: boolean;
    onFocusModeChange?: (enabled: boolean) => void;
    /** Read once, at mount — see the component body's comment on why this can't be a live/controlled prop the way `BlockListEditor`'s `blocks` was. */
    initialBlocks: Block[];
    /**
     * Fired on every change to the editor's document — subscribed via
     * BlockNote's OWN `editor.onChange()` (see BlockNoteEditor.d.ts), not a
     * React re-render on every keystroke. Added for autosave
     * (`shared/lib/use-autosave-draft.ts`): the caller passes
     * `scheduleSave` here, which just (re)starts a debounce timer — it does
     * NOT read `getBlocks()` itself from this callback (that would defeat
     * the whole point of not running `blocksToMarkdownLossy` on every
     * keystroke, see this component's top comment); the debounced save
     * calls `getBlocks()` once, later, through the same ref this component
     * already exposes.
     */
    onChange?: () => void;
}

/**
 * BlockNoteEditor
 * ----------------
 * Replaces `BlockListEditor`/`BlockFields` (Phase 4's "pick a type from a
 * list → add → fill in fields" admin form) with an actual WYSIWYG editor —
 * slash menu to insert a block, a floating toolbar for bold/italic/links
 * on text selection, and inline editing for every block type via
 * `../schema.ts`'s custom specs. Exposes `getBlocks()` through a ref
 * instead of a `value`/`onChange` prop pair: BlockNote's `useCreateBlockNote`
 * already owns a live ProseMirror document the whole time the editor is
 * mounted, and mirroring every keystroke back out into a parent-owned
 * `Block[]`/`BlockInput[]` state (re-running `blocksToMarkdownLossy` on
 * every character) would be pure waste for a value nothing needs until
 * the surrounding form's submit handler asks for it.
 *
 * `BlockEditor` (exported below) is deliberately a thin gate around
 * `MountedBlockEditor` (everything that actually touches BlockNote),
 * NOT one component that calls all its hooks unconditionally — found
 * live, not by inspection: BlockNote (`useCreateBlockNote`, and even a
 * throwaway `BlockNoteEditor.create()` used only for parsing, see
 * `convert.ts`) needs real browser DOM APIs it assumes are always
 * available, and Next.js SERVER-RENDERS "use client" components too, for
 * the initial HTML — crashing with `ReferenceError: document is not
 * defined` on the very first request to `/admin/journal/[slug]/edit`,
 * even though this file has `"use client"` at the top. This is BlockNote's
 * own documented limitation (see their Next.js integration guide, "make
 * sure Next.js does not try to render BlockNote as a server-side
 * component"), not something specific to this project's schema. The
 * officially recommended fix is `next/dynamic(..., { ssr: false })`
 * around the whole editor component — this uses the equivalent
 * "mounted" gate instead (render nothing BlockNote-related until a
 * `useEffect` — which never runs during SSR — flips `mounted` to `true`)
 * so `ref` still forwards directly to `MountedBlockEditor`'s real
 * `useImperativeHandle`, without going through `next/dynamic`'s lazy-
 * loading wrapper and its own ref-forwarding behavior.
 */
export const BlockEditor = React.forwardRef<BlockEditorHandle, BlockEditorProps>(function BlockEditor(props, ref) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Server AND the client's own first render (before this effect runs)
    // both take this branch — identical output, no hydration mismatch —
    // deliberately a plain placeholder with no BlockNote import reachable
    // from this code path at all, so nothing in `MountedBlockEditor`'s
    // module graph is even evaluated until the browser is definitely
    // present.
    if (!mounted) {
        return (
            <div
                className="rounded-md border border-border-strong bg-surface-base h-60 animate-pulse"
                aria-hidden="true"
            />
        );
    }

    return <MountedBlockEditor {...props} ref={ref} />;
});

const MountedBlockEditor = React.forwardRef<BlockEditorHandle, BlockEditorProps>(function MountedBlockEditor(
    { initialBlocks, onChange, appearance = "default", readOnly = false, focusMode = false, onFocusModeChange },
    ref,
) {
    const { theme } = useTheme();

    // `useState(() => ...)`, not a plain call — `initialContent` is only
    // ever read by `useCreateBlockNote` on the editor's FIRST construction
    // (see BlockNote's docs); recomputing `blocksToPartialBlocks` on every
    // render would run the Markdown parser repeatedly for a result that's
    // discarded every time after the first.
    const [initialContent] = React.useState(() => blocksToPartialBlocks(initialBlocks));

    const editor = useCreateBlockNote({
        schema: blockNoteSchema,
        domAttributes: { editor: { "aria-label": "Body" } },
        initialContent: initialContent.length > 0 ? initialContent : undefined,
        // See paste-handler.ts — only intercepts a fence/blockquote, everything else falls through to BlockNote's own default paste behavior unchanged.
        pasteHandler: smartPasteHandler,
        // See fence-shortcut.ts — typing "```lang" then Enter converts the current (plain paragraph) block to a code/diagram block.
        extensions: [fenceShortcutExtension],
    });

    const selectionRef = React.useRef<{ from: number; to: number } | null>(null);
    const [blockType, setBlockType] = React.useState<"paragraph" | "heading2" | "heading3" | "custom">("paragraph");
    const [activeStyles, setActiveStyles] = React.useState({ bold: false, italic: false });
    const [linkOpen, setLinkOpen] = React.useState(false);
    const [linkUrl, setLinkUrl] = React.useState("");
    const [linkError, setLinkError] = React.useState<string>();
    const captureSelection = React.useCallback(() => {
        const { from, to } = editor._tiptapEditor.state.selection;
        return { from, to };
    }, [editor]);
    const restoreSelection = React.useCallback(
        (snapshot: unknown) => {
            if (
                !snapshot ||
                typeof snapshot !== "object" ||
                !("from" in snapshot) ||
                !("to" in snapshot) ||
                typeof snapshot.from !== "number" ||
                typeof snapshot.to !== "number"
            )
                return;
            const size = editor._tiptapEditor.state.doc.content.size;
            editor._tiptapEditor.commands.setTextSelection({
                from: Math.min(snapshot.from, size),
                to: Math.min(snapshot.to, size),
            });
            editor.focus();
        },
        [editor],
    );
    React.useEffect(
        () =>
            editor.onSelectionChange(() => {
                selectionRef.current = captureSelection();
                const block = editor.getTextCursorPosition().block;
                setBlockType(
                    block.type === "paragraph"
                        ? "paragraph"
                        : block.type === "heading"
                          ? block.props.level === 3
                              ? "heading3"
                              : "heading2"
                          : "custom",
                );
                const styles = editor.getActiveStyles();
                setActiveStyles({ bold: Boolean(styles.bold), italic: Boolean(styles.italic) });
            }),
        [editor, captureSelection],
    );

    function command(action: EditorCommand) {
        if (readOnly) return;
        if (selectionRef.current) restoreSelection(selectionRef.current);
        editor.focus();
        if (action === "bold" || action === "italic") editor.toggleStyles({ [action]: true });
        else if (action === "link") {
            selectionRef.current = captureSelection();
            setLinkUrl(editor.getSelectedLinkUrl() ?? "");
            setLinkError(undefined);
            setLinkOpen(true);
        } else if (action === "insert") editor.getExtension(SuggestionMenu)?.openSuggestionMenu("/");
        else if (action === "code")
            editor.insertBlocks([{ type: "codeSnippet" }], editor.getTextCursorPosition().block, "after");
        else {
            const block = editor.getTextCursorPosition().block;
            if (block.type !== "paragraph" && block.type !== "heading") return;
            if (action === "paragraph") editor.updateBlock(block, { type: "paragraph" });
            else editor.updateBlock(block, { type: "heading", props: { level: action === "heading2" ? 2 : 3 } });
            setBlockType(action);
        }
        const styles = editor.getActiveStyles();
        setActiveStyles({ bold: Boolean(styles.bold), italic: Boolean(styles.italic) });
    }
    function applyLink() {
        const value = linkUrl.trim();
        try {
            const parsed = new URL(value, window.location.origin);
            if (!value || !["http:", "https:", "mailto:"].includes(parsed.protocol)) throw new Error("invalid");
        } catch {
            setLinkError("Enter an HTTP, HTTPS, email or relative link.");
            return;
        }
        restoreSelection(selectionRef.current);
        editor.createLink(value);
        setLinkOpen(false);
    }

    React.useImperativeHandle(
        ref,
        () => ({
            getBlocks: () => editorBlocksToBlockInputs(editor, editor.document),
            focus: () => editor.focus(),
            captureSelection,
            restoreSelection,
        }),
        [editor, captureSelection, restoreSelection],
    );

    // `onChangeRef`, not `onChange` directly in the effect's dependency
    // array — the caller (`PostEditorPage`/`WorkEditorPage`) passes a fresh
    // `() => autosave.scheduleSave()` closure every render; depending on it
    // directly would tear down and re-subscribe `editor.onChange()` on
    // every keystroke elsewhere in the form for no benefit, since all this
    // effect actually needs is to always CALL the latest callback, not to
    // re-run itself when that callback's identity changes.
    const onChangeRef = React.useRef(onChange);
    onChangeRef.current = onChange;

    React.useEffect(
        () =>
            editor.onChange((_editor, context) => {
                // setEditable emits a Tiptap update without a document change. It must
                // not make a reviewed draft dirty merely because actions lock editing.
                if (context.getChanges().length > 0) onChangeRef.current?.();
            }),
        [editor],
    );

    return (
        <div
            className={
                appearance === "authoring"
                    ? "portfolio-authoring"
                    : "rounded-md border border-border-strong bg-surface-base overflow-hidden"
            }
            onBlurCapture={() => {
                selectionRef.current = captureSelection();
            }}
        >
            {appearance === "authoring" && (
                <EditorToolbar
                    onCommand={command}
                    readOnly={readOnly}
                    blockType={blockType}
                    canChangeBlockType={blockType !== "custom"}
                    focusMode={focusMode}
                    onFocusModeChange={(enabled) => onFocusModeChange?.(enabled)}
                    activeStyles={activeStyles}
                />
            )}
            <BlockNoteView editor={editor} slashMenu={false} theme={theme} editable={!readOnly}>
                <SuggestionMenuController
                    triggerCharacter="/"
                    getItems={async (query) => filterSuggestionItems(getSlashMenuItems(editor), query)}
                />
            </BlockNoteView>
            <Dialog open={linkOpen} title="Insert link" onClose={() => setLinkOpen(false)}>
                <div className="flex flex-col gap-lg">
                    <Field label="Link URL" htmlFor="body-link-url" error={linkError}>
                        <Input
                            id="body-link-url"
                            value={linkUrl}
                            onChange={(event) => setLinkUrl(event.target.value)}
                        />
                    </Field>
                    <Button appearance="flat" onClick={applyLink}>
                        Apply link
                    </Button>
                </div>
            </Dialog>
        </div>
    );
});
