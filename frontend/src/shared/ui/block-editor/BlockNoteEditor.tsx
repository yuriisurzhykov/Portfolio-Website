"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import * as React from "react";
import { filterSuggestionItems } from "@blocknote/core";
import { useCreateBlockNote, SuggestionMenuController } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Block, BlockInput } from "@portfolio/backend";
import { useTheme } from "@/shared/theme";
import { blockNoteSchema } from "./schema";
import { blocksToPartialBlocks, editorBlocksToBlockInputs } from "./convert";
import { getSlashMenuItems } from "./slash-menu";

export interface BlockEditorHandle {
    /** Serializes the editor's current document to `BlockInput[]` — called at submit time (`PostEditorPage`/`WorkEditorPage`/the translate pages), not on every keystroke; BlockNote owns its own live document state between mount and submit, this component is deliberately NOT a controlled `value`/`onChange` input like the old `BlockListEditor`. */
    getBlocks: () => BlockInput[];
}

export interface BlockEditorProps {
    /** Read once, at mount — see the component body's comment on why this can't be a live/controlled prop the way `BlockListEditor`'s `blocks` was. */
    initialBlocks: Block[];
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
        return <div className="rounded-md border border-border-strong bg-surface-base h-[240px] animate-pulse" aria-hidden="true" />;
    }

    return <MountedBlockEditor {...props} ref={ref} />;
});

const MountedBlockEditor = React.forwardRef<BlockEditorHandle, BlockEditorProps>(function MountedBlockEditor({ initialBlocks }, ref) {
    const { theme } = useTheme();

    // `useState(() => ...)`, not a plain call — `initialContent` is only
    // ever read by `useCreateBlockNote` on the editor's FIRST construction
    // (see BlockNote's docs); recomputing `blocksToPartialBlocks` on every
    // render would run the Markdown parser repeatedly for a result that's
    // discarded every time after the first.
    const [initialContent] = React.useState(() => blocksToPartialBlocks(initialBlocks));

    const editor = useCreateBlockNote({
        schema: blockNoteSchema,
        initialContent: initialContent.length > 0 ? initialContent : undefined,
    });

    React.useImperativeHandle(
        ref,
        () => ({
            getBlocks: () => editorBlocksToBlockInputs(editor, editor.document),
        }),
        [editor],
    );

    return (
        <div className="rounded-md border border-border-strong bg-surface-base overflow-hidden">
            <BlockNoteView editor={editor} slashMenu={false} theme={theme}>
                <SuggestionMenuController
                    triggerCharacter="/"
                    getItems={async (query) => filterSuggestionItems(getSlashMenuItems(editor), query)}
                />
            </BlockNoteView>
        </div>
    );
});
