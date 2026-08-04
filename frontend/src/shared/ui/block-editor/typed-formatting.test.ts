import { describe, expect, it } from "vitest";
import { BlockNoteEditor } from "@blocknote/core";
import { blockNoteSchema } from "./schema";

/**
 * Types text one character at a time through the REAL ProseMirror
 * `handleTextInput` plugin prop — the same mechanism a real keystroke goes
 * through in a browser — rather than setting `initialContent` directly,
 * which would skip input rules entirely and prove nothing about live
 * typing. Falls back to a plain `insertText` for any character no plugin
 * claims (`handleTextInput` returns falsy for ordinary characters with no
 * matching rule, exactly like a real browser would insert them verbatim).
 */
function typeText(editor: ReturnType<typeof BlockNoteEditor.create>, text: string) {
    const view = (editor as any).prosemirrorView;
    for (const ch of text) {
        const pos = view.state.selection.from;
        const handled = view.someProp("handleTextInput", (f: any) => f(view, pos, pos, ch));
        if (!handled) {
            view.dispatch(view.state.tr.insertText(ch, pos));
        }
    }
}

function mountEmpty() {
    const editor = BlockNoteEditor.create({
        schema: blockNoteSchema,
        initialContent: [{ type: "paragraph", content: "" }],
    });
    const dom = document.createElement("div");
    document.body.appendChild(dom);
    editor.mount(dom);
    editor.setTextCursorPosition(editor.document[0], "end");
    return editor;
}

/**
 * Pins that BlockNote's default `**bold**`/`*italic*` markdown-shorthand
 * input rules already work in this editor, untouched by `schema.ts`
 * (which only customizes `blockSpecs`, not `styleSpecs` — see its top
 * comment) — no new code was needed for this specific ask. Verified live
 * via a real mounted editor and the actual `handleTextInput` plugin
 * mechanism, not assumed from reading BlockNote's source.
 */
describe("typed markdown shorthand (BlockNote's own default input rules)", () => {
    it("converts **text** to real bold styling while typing, not literal asterisks", () => {
        const editor = mountEmpty();
        typeText(editor, "**bold** after");

        expect(editor.document[0]).toMatchObject({
            content: [
                { type: "text", text: "bold", styles: { bold: true } },
                { type: "text", text: " after", styles: {} },
            ],
        });
    });

    it("converts *text* to real italic styling while typing, not literal asterisks", () => {
        const editor = mountEmpty();
        typeText(editor, "*italic* after");

        expect(editor.document[0]).toMatchObject({
            content: [
                { type: "text", text: "italic", styles: { italic: true } },
                { type: "text", text: " after", styles: {} },
            ],
        });
    });
});

function pressKey(editor: ReturnType<typeof BlockNoteEditor.create>, key: string, modifiers: { shiftKey?: boolean } = {}) {
    const dom = (editor as any).prosemirrorView.dom as HTMLElement;
    dom.dispatchEvent(new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true, ...modifiers }));
}

/**
 * Pins that typing "- "/"1. " already auto-converts the current block to a
 * real list item, and that Tab already nests it under the previous
 * sibling — both BlockNote defaults, registered for free by `schema.ts`
 * once `bulletListItem`/`numberedListItem` were added (see item 1 of the
 * plan). Same "real mounted editor, real event" verification as above,
 * not an assumption from reading BlockNote's source.
 */
describe("typed list shorthand and Tab nesting (BlockNote's own defaults)", () => {
    it("converts '- ' to a real bulletListItem block while typing", () => {
        const editor = mountEmpty();
        typeText(editor, "- one");

        expect(editor.document[0]).toMatchObject({ type: "bulletListItem", content: [{ text: "one" }] });
    });

    it("converts '1. ' to a real numberedListItem block while typing", () => {
        const editor = mountEmpty();
        typeText(editor, "1. one");

        expect(editor.document[0]).toMatchObject({ type: "numberedListItem", content: [{ text: "one" }] });
    });

    it("Tab nests a bulletListItem under the previous sibling as a real child, and Shift-Tab lifts it back out", () => {
        const editor = mountEmpty();
        typeText(editor, "- first");
        editor.insertBlocks([{ type: "bulletListItem", content: "second" }], editor.document[0], "after");
        editor.setTextCursorPosition(editor.document[1], "start");

        pressKey(editor, "Tab");
        expect(editor.document).toHaveLength(1);
        expect(editor.document[0].children).toMatchObject([{ content: [{ text: "second" }] }]);

        pressKey(editor, "Tab", { shiftKey: true });
        expect(editor.document).toHaveLength(2);
        expect(editor.document[1]).toMatchObject({ content: [{ text: "second" }] });
    });
});
