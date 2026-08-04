import { createExtension } from "@blocknote/core";
import type { PortfolioBlock } from "./convert";

const DIAGRAM_ENGINES = new Set(["mermaid", "plantuml"]);

/** Matches a block whose ENTIRE text is just a fence opener — "```", or "```" plus a bare language name, nothing else. Text is trimmed before matching, so a stray trailing space before Enter (easy to type without noticing) doesn't silently defeat it. */
const FENCE_OPENER = /^```(\w*)$/;

const FENCE_ELIGIBLE_TYPES = new Set(["paragraph", "bulletListItem", "numberedListItem"]);

function plainTextOf(block: PortfolioBlock): string | undefined {
    if (!Array.isArray(block.content) || !block.content.every((c) => c.type === "text")) {
        // Bold/linked/mixed content is never what someone typing a fence
        // marker produces — bails out rather than guessing what "the text"
        // means for it.
        return undefined;
    }
    return block.content.map((c) => c.text).join("");
}

/**
 * BlockNote's own `codeBlock` block spec ships an input rule for exactly
 * this ("```lang " + a trailing space converts the block — see
 * `node_modules/@blocknote/core/src/blocks/Code/block.ts`), but that rule
 * lives on the `codeBlock` type this editor doesn't register (`schema.ts`
 * uses `codeSnippet` instead — see its top comment), AND it triggers on a
 * typed trailing SPACE character, not on Enter, since ProseMirror input
 * rules only ever fire from `handleTextInput` (character insertion), never
 * from a keypress that splits/creates a block. Implemented as an `Enter`
 * keyboard shortcut instead, matching the literal "type ```lang, press
 * Enter" gesture this was asked for.
 *
 * Registered as a top-level editor extension (`BlockNoteEditor.tsx`'s
 * `extensions` option), not attached to any one block spec — it needs to
 * run for a plain `paragraph` (before that type's own Enter handling,
 * i.e. splitting the block, gets a chance to) AND for a list item (before
 * `ListItemKeyboardShortcuts`'s own per-block-spec Enter handler, which
 * would otherwise just create another list item). Both cases confirmed
 * live with a real simulated `KeyboardEvent("keydown", {key: "Enter"})`
 * dispatched at a genuinely mounted editor's `view.dom` — see this file's
 * test for the harness.
 *
 * Bails out if the block already has `children` (nested sub-items/blocks)
 * — converting to a `codeSnippet`/`diagram` (`content: "none"`) would
 * leave them dangling under a type never meant to carry them. Simplest
 * correct behavior is to not fire here at all, not to invent somewhere to
 * relocate them.
 */
export const fenceShortcutExtension = createExtension({
    key: "fence-shortcut",
    // Without this, list items' OWN Enter handler wins the tie: verified
    // live that with no `runsBefore` declared, a list item's per-block-spec
    // extension ("bullet-list-item-shortcuts"/"numbered-list-item-shortcuts"
    // — see `node_modules/@blocknote/core/src/blocks/ListItem/*`) fires
    // instead of this one, creating a new empty list item rather than
    // converting the current one. `sortByDependencies` (`util/topo-sort.ts`)
    // gives every extension with no declared dependency the SAME default
    // priority, and ties apparently resolve in the list item's favor in
    // practice — an explicit `runsBefore` sidesteps needing to know exactly
    // why, and makes the intended order self-documenting either way.
    runsBefore: ["bullet-list-item-shortcuts", "numbered-list-item-shortcuts"],
    keyboardShortcuts: {
        Enter: ({ editor }) => {
            const block = editor.getTextCursorPosition().block as PortfolioBlock;
            if (!FENCE_ELIGIBLE_TYPES.has(block.type) || block.children.length > 0) {
                return false;
            }

            const text = plainTextOf(block);
            const match = text !== undefined ? FENCE_OPENER.exec(text.trimEnd()) : null;
            if (!match) {
                return false;
            }

            const language = match[1].toLowerCase();
            if (DIAGRAM_ENGINES.has(language)) {
                editor.updateBlock(block, {
                    type: "diagram",
                    props: { engine: language as "mermaid" | "plantuml", source: "", caption: "" },
                });
            } else {
                editor.updateBlock(block, {
                    type: "codeSnippet",
                    props: { filename: "", language: match[1], code: "" },
                });
            }
            return true;
        },
    },
});
