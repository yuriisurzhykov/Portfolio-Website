import { describe, expect, it } from "vitest";
import { BlockNoteEditor } from "@blocknote/core";
import { blockNoteSchema } from "./schema";
import { fenceShortcutExtension } from "./fence-shortcut";

/**
 * Mounts a real editor (via a real DOM element, not just `.create()`) and
 * dispatches a genuine `KeyboardEvent("keydown", {key: "Enter"})` at its
 * ProseMirror view — the same harness that first proved this approach works
 * live (see `fence-shortcut.ts`'s top comment) — rather than calling the
 * extension's handler function directly, which would only prove the
 * function's own logic, not that it's actually reachable from a real Enter
 * keypress ahead of the block's own default Enter handling.
 */
function mountWithText(text: string) {
    const editor = BlockNoteEditor.create({
        schema: blockNoteSchema,
        initialContent: [{ type: "paragraph", content: text }],
        extensions: [fenceShortcutExtension],
    });
    const dom = document.createElement("div");
    document.body.appendChild(dom);
    editor.mount(dom);
    editor.setTextCursorPosition(editor.document[0], "end");
    return editor;
}

function pressEnter(editor: ReturnType<typeof BlockNoteEditor.create>) {
    const event = new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true });
    (editor as any).prosemirrorView.dom.dispatchEvent(event);
}

/** Same as `mountWithText`, but for a block shape `mountWithText` can't express (a list item, with or without nested children). */
function mountWithBlock(block: object) {
    const editor = BlockNoteEditor.create({
        schema: blockNoteSchema,
        initialContent: [block as any],
        extensions: [fenceShortcutExtension],
    });
    const dom = document.createElement("div");
    document.body.appendChild(dom);
    editor.mount(dom);
    editor.setTextCursorPosition(editor.document[0], "end");
    return editor;
}

describe("fenceShortcutExtension", () => {
    it("converts a paragraph containing exactly '```<lang>' to a codeSnippet block on Enter", () => {
        const editor = mountWithText("```kotlin");
        pressEnter(editor);

        expect(editor.document).toHaveLength(1);
        expect(editor.document[0]).toMatchObject({ type: "codeSnippet", props: { language: "kotlin", code: "" } });
    });

    it("converts '```mermaid' to a diagram block, not a codeSnippet", () => {
        const editor = mountWithText("```mermaid");
        pressEnter(editor);

        expect(editor.document[0]).toMatchObject({ type: "diagram", props: { engine: "mermaid", source: "" } });
    });

    it("converts '```plantuml' to a diagram block with the plantuml engine", () => {
        const editor = mountWithText("```plantuml");
        pressEnter(editor);

        expect(editor.document[0]).toMatchObject({ type: "diagram", props: { engine: "plantuml" } });
    });

    it("converts a bare '```' with no language to a codeSnippet with an empty language", () => {
        const editor = mountWithText("```");
        pressEnter(editor);

        expect(editor.document[0]).toMatchObject({ type: "codeSnippet", props: { language: "", code: "" } });
    });

    it("is case-insensitive for the diagram engine names ('```Mermaid' still becomes a diagram)", () => {
        const editor = mountWithText("```Mermaid");
        pressEnter(editor);

        expect(editor.document[0]).toMatchObject({ type: "diagram", props: { engine: "mermaid" } });
    });

    it("does NOT convert ordinary text, letting Enter split the block as normal", () => {
        const editor = mountWithText("Just some ordinary text");
        pressEnter(editor);

        // Enter's default behavior on non-empty text splits it into two
        // blocks — proves this extension didn't swallow the keypress for
        // unrelated content.
        expect(editor.document.length).toBeGreaterThan(1);
        expect(editor.document.map((b) => b.type)).toEqual(["paragraph", "paragraph"]);
    });

    it("does NOT convert text that merely CONTAINS a fence marker, only an EXACT match", () => {
        const editor = mountWithText("some ```kotlin code");
        pressEnter(editor);

        expect(editor.document[0].type).toBe("paragraph");
    });

    it("tolerates a trailing space before Enter (easy to type without noticing)", () => {
        const editor = mountWithText("```kotlin ");
        pressEnter(editor);

        expect(editor.document[0]).toMatchObject({ type: "codeSnippet", props: { language: "kotlin" } });
    });

    it("also converts a bulletListItem containing exactly '```<lang>' to a codeSnippet", () => {
        const editor = mountWithBlock({ type: "bulletListItem", content: "```kotlin" });
        pressEnter(editor);

        expect(editor.document).toHaveLength(1);
        expect(editor.document[0]).toMatchObject({ type: "codeSnippet", props: { language: "kotlin", code: "" } });
    });

    it("also converts a numberedListItem containing exactly '```mermaid' to a diagram", () => {
        const editor = mountWithBlock({ type: "numberedListItem", content: "```mermaid" });
        pressEnter(editor);

        expect(editor.document[0]).toMatchObject({ type: "diagram", props: { engine: "mermaid" } });
    });

    /**
     * Guards against the case last session's self-review flagged: a list
     * item that already has nested children (sub-items/blocks) would leave
     * them dangling under a `content: "none"` type if converted — this
     * must NOT fire there at all, letting Enter fall through to the list
     * item's own default handling (create another list item) instead.
     */
    it("does NOT convert a list item that already has nested children", () => {
        const editor = mountWithBlock({
            type: "bulletListItem",
            content: "```kotlin",
            children: [{ type: "bulletListItem", content: "a nested item" }],
        });
        pressEnter(editor);

        expect(editor.document[0].type).toBe("bulletListItem");
    });
});
