import { describe, expect, it, vi } from "vitest";
import { BlockNoteEditor, getBlockInfoFromTransaction } from "@blocknote/core";
import { TextSelection, type Transaction } from "prosemirror-state";
import { blockNoteSchema } from "./schema";
import { splitPastedMarkdown, smartPasteHandler, normalizeLineEndings } from "./paste-handler";

/** Places the cursor at a character offset within `block`'s own inline content — same `getBlockInfoFromTransaction` technique `paste-handler.ts`'s own split logic uses, so these tests exercise the exact position math it relies on. */
function placeCursorAt(editor: ReturnType<typeof BlockNoteEditor.create>, block: { id: string }, offset: number) {
    editor.setTextCursorPosition(block, "start");
    editor.transact((tr: Transaction) => {
        const blockInfo = getBlockInfoFromTransaction(tr);
        if (!blockInfo.isBlockContainer) {
            throw new Error("expected a block-container block in this test");
        }
        const contentStart = blockInfo.blockContent.beforePos + 1;
        tr.setSelection(TextSelection.near(tr.doc.resolve(contentStart + offset)));
    });
}

describe("splitPastedMarkdown", () => {
    it("returns a single text segment for plain markdown with no fence or blockquote", () => {
        expect(splitPastedMarkdown("Hello **world**")).toEqual([{ kind: "text", text: "Hello **world**" }]);
    });

    it("extracts a fenced code block's language and code, separately from surrounding text", () => {
        const source = "Before\n```kotlin\nfun main() {}\n```\nAfter";
        expect(splitPastedMarkdown(source)).toEqual([
            { kind: "text", text: "Before" },
            { kind: "fence", language: "kotlin", code: "fun main() {}" },
            { kind: "text", text: "After" },
        ]);
    });

    it("extracts a fence with no language specified", () => {
        expect(splitPastedMarkdown("```\nplain\n```")).toEqual([{ kind: "fence", language: "", code: "plain" }]);
    });

    it("keeps everything collected so far for an unterminated fence, instead of dropping it", () => {
        expect(splitPastedMarkdown("```js\nconst x = 1;")).toEqual([{ kind: "fence", language: "js", code: "const x = 1;" }]);
    });

    it("preserves multiple lines and blank lines inside a fence's code", () => {
        const source = "```\nline1\n\nline3\n```";
        expect(splitPastedMarkdown(source)).toEqual([{ kind: "fence", language: "", code: "line1\n\nline3" }]);
    });

    it("groups consecutive '> ' lines into one quote segment, stripping the marker", () => {
        const source = "> Line one\n> Line two";
        expect(splitPastedMarkdown(source)).toEqual([{ kind: "quote", text: "Line one\nLine two" }]);
    });

    it("strips a bare '>' with no following space the same as '> '", () => {
        expect(splitPastedMarkdown(">Line one")).toEqual([{ kind: "quote", text: "Line one" }]);
    });

    it("ends a quote run at the first non-'>' line, starting a new text segment", () => {
        const source = "> Quoted\nNot quoted";
        expect(splitPastedMarkdown(source)).toEqual([
            { kind: "quote", text: "Quoted" },
            { kind: "text", text: "Not quoted" },
        ]);
    });

    it("does not mistake a '> ' line INSIDE a fence's code for a blockquote", () => {
        const source = "```\n> not a quote, just code\n```";
        expect(splitPastedMarkdown(source)).toEqual([{ kind: "fence", language: "", code: "> not a quote, just code" }]);
    });

    it("handles a document with a fence, a quote, and plain text all interleaved", () => {
        const source = "Intro\n```py\nprint(1)\n```\nMiddle\n> A quote\nOutro";
        expect(splitPastedMarkdown(source)).toEqual([
            { kind: "text", text: "Intro" },
            { kind: "fence", language: "py", code: "print(1)" },
            { kind: "text", text: "Middle" },
            { kind: "quote", text: "A quote" },
            { kind: "text", text: "Outro" },
        ]);
    });
});

describe("normalizeLineEndings", () => {
    it("converts every CRLF to a bare LF", () => {
        expect(normalizeLineEndings("a\r\nb\r\nc")).toBe("a\nb\nc");
    });

    it("leaves text with no CRLF completely unchanged", () => {
        expect(normalizeLineEndings("a\nb\nc")).toBe("a\nb\nc");
    });
});

describe("smartPasteHandler", () => {
    /** `types` defaults to a plain-text-only clipboard (no `text/html`) — the common case for every existing test here; pass `{ hasHtml: true }` to simulate a rich copy that also carries an HTML mirror. */
    function fakeClipboardEvent(text: string, options?: { hasHtml?: boolean }): ClipboardEvent {
        const types = options?.hasHtml ? ["text/plain", "text/html"] : ["text/plain"];
        return { clipboardData: { getData: () => text, types } } as unknown as ClipboardEvent;
    }

    it("delegates to defaultPasteHandler when the pasted text has no fence or blockquote", () => {
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema });
        let delegated = false;
        const result = smartPasteHandler({
            event: fakeClipboardEvent("## Just a heading"),
            editor: editor as any,
            defaultPasteHandler: () => {
                delegated = true;
                return true;
            },
        });
        expect(delegated).toBe(true);
        expect(result).toBe(true);
    });

    /**
     * Regression test for a real bug found pasting in an ACTUAL browser
     * (jsdom alone never would have caught this — see this file's other
     * comments on `ClipboardEvent` not existing there): a real clipboard's
     * `text/plain` uses `\r\n`, even when the copied source used bare
     * `\n`. A plain markdown list with no fence/quote used to delegate
     * straight to `defaultPasteHandler()`, which would re-read the
     * clipboard itself and hand `@blocknote/core`'s own markdown-to-HTML
     * tokenizer the UNNORMALIZED `\r\n` text — its list-item regex
     * (`(.*)$`, no `/m` flag) never matches a `\r`-terminated line, so
     * every list item silently became a plain paragraph with the literal
     * `-`/`*` marker left in the text (verified directly against
     * `markdownToHtml` — see paste-handler.ts's `normalizeLineEndings`
     * comment). `pasteMarkdown` is stubbed to a no-op, same technique as
     * the anchor-position regression tests below — this isn't testing
     * BlockNote's own parser, only that OUR code hands it `\n`, never `\r`.
     */
    it("handles a CRLF plain-text list itself (not defaultPasteHandler), with line endings normalized to LF first", () => {
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema });
        let delegated = false;
        let textPassedToPasteMarkdown: string | undefined;
        vi.spyOn(editor, "pasteMarkdown").mockImplementation((text: string) => {
            textPassedToPasteMarkdown = text;
        });

        const result = smartPasteHandler({
            event: fakeClipboardEvent("- a sequence number;\r\n- a timestamp;\r\n"),
            editor: editor as any,
            defaultPasteHandler: () => {
                delegated = true;
                return true;
            },
        });

        expect(delegated).toBe(false);
        expect(result).toBe(true);
        expect(textPassedToPasteMarkdown).toBe("- a sequence number;\n- a timestamp;\n");
    });

    /**
     * Regression test for a real review finding on the fix above: a rich
     * copy from a browser/Word/Google Docs commonly carries BOTH
     * `text/html` AND a `text/plain` mirror, and that mirror is just as
     * likely to have `\r\n` as a plain-text-only copy — normalizing and
     * forcing `pasteMarkdown` regardless of `text/html`'s presence would
     * silently downgrade real formatting/links to plain markdown, taking
     * the html-vs-markdown decision away from `defaultPasteHandler()`'s
     * own heuristic instead of just fixing the CRLF bug within it. Only a
     * clipboard with NO `text/html` at all should ever take the
     * normalize-and-paste-ourselves path.
     */
    it("still delegates to defaultPasteHandler for a CRLF plain-text mirror when text/html is ALSO on the clipboard, instead of downgrading rich content to markdown", () => {
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema });
        let delegated = false;
        const pasteMarkdownSpy = vi.spyOn(editor, "pasteMarkdown");

        const result = smartPasteHandler({
            event: fakeClipboardEvent("- a sequence number;\r\n- a timestamp;\r\n", { hasHtml: true }),
            editor: editor as any,
            defaultPasteHandler: () => {
                delegated = true;
                return true;
            },
        });

        expect(delegated).toBe(true);
        expect(result).toBe(true);
        expect(pasteMarkdownSpy).not.toHaveBeenCalled();
    });

    it("still delegates to defaultPasteHandler for plain text with no fence/quote when there's no CRLF to normalize (no behavior change)", () => {
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema });
        let delegated = false;
        const result = smartPasteHandler({
            event: fakeClipboardEvent("- a sequence number;\n- a timestamp;\n"),
            editor: editor as any,
            defaultPasteHandler: () => {
                delegated = true;
                return true;
            },
        });
        expect(delegated).toBe(true);
        expect(result).toBe(true);
    });

    it("normalizes CRLF before segmenting too, so a fence/quote segment's text is already clean LF", () => {
        const source = "> A quote\r\n\r\n```js\r\nconst x = 1;\r\n```";
        expect(splitPastedMarkdown(normalizeLineEndings(source))).toEqual([
            { kind: "quote", text: "A quote" },
            { kind: "text", text: "" },
            { kind: "fence", language: "js", code: "const x = 1;" },
        ]);
    });

    it("delegates to defaultPasteHandler when clipboardData has no text/plain data at all", () => {
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema });
        let delegated = false;
        const result = smartPasteHandler({
            event: { clipboardData: { getData: () => "" } } as unknown as ClipboardEvent,
            editor: editor as any,
            defaultPasteHandler: () => {
                delegated = true;
                return true;
            },
        });
        expect(delegated).toBe(true);
        expect(result).toBe(true);
    });

    it("inserts a fenced code block as a real codeSnippet block, overwriting the empty starting paragraph", () => {
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema });
        const result = smartPasteHandler({
            event: fakeClipboardEvent("```kotlin\nfun main() {}\n```"),
            editor: editor as any,
            defaultPasteHandler: () => undefined,
        });

        expect(result).toBe(true);
        expect(editor.document).toHaveLength(1);
        expect(editor.document[0]).toMatchObject({
            type: "codeSnippet",
            props: { language: "kotlin", code: "fun main() {}" },
        });
    });

    it("inserts a ```mermaid fence as a real diagram block, not a codeSnippet", () => {
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema });
        smartPasteHandler({
            event: fakeClipboardEvent("```mermaid\ngraph TD;\nA-->B;\n```"),
            editor: editor as any,
            defaultPasteHandler: () => undefined,
        });

        expect(editor.document[0]).toMatchObject({
            type: "diagram",
            props: { engine: "mermaid", source: "graph TD;\nA-->B;" },
        });
    });

    it("inserts a blockquote as a real quote block with its inline formatting parsed", () => {
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema });
        smartPasteHandler({
            event: fakeClipboardEvent("> A **bold** quote"),
            editor: editor as any,
            defaultPasteHandler: () => undefined,
        });

        const block = editor.document[0];
        expect(block.type).toBe("quote");
        expect(block.type === "quote" && block.content).toEqual([
            { type: "text", text: "A ", styles: {} },
            { type: "text", text: "bold", styles: { bold: true } },
            { type: "text", text: " quote", styles: {} },
        ]);
    });

    // A leading/trailing/interleaved "text" segment (e.g. "Intro\n```js...")
    // goes through `editor.pasteMarkdown`, which — unlike
    // `tryParseMarkdownToBlocks`/`blocksToMarkdownLossy` elsewhere in this
    // slice — needs a REAL mounted ProseMirror view with genuine clipboard
    // API support, not just a constructed-but-unmounted editor (jsdom
    // doesn't implement `ClipboardEvent`, confirmed by running this against
    // a `.mount()`-ed editor and hitting `ReferenceError: ClipboardEvent is
    // not defined` inside prosemirror-view). Matches this slice's own
    // documented limitation (`README.md`'s "Тесты и проверка" section) —
    // this test instead proves ordering across two fence/quote segments
    // with NO plain-text segment between them, which doesn't need
    // `pasteMarkdown` at all.
    it("keeps a fence followed directly by a quote in the right order, as two separate blocks", () => {
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema });
        smartPasteHandler({
            event: fakeClipboardEvent("```js\nconst x = 1;\n```\n> Outro quote"),
            editor: editor as any,
            defaultPasteHandler: () => undefined,
        });

        expect(editor.document.map((b) => b.type)).toEqual(["codeSnippet", "quote"]);
        expect(editor.document[0]).toMatchObject({ props: { language: "js", code: "const x = 1;" } });
        expect(editor.document[1]).toMatchObject({ content: [{ type: "text", text: "Outro quote" }] });
    });

    /**
     * Regression test for a real bug found pasting a long mixed document: a
     * `"text"` segment right after a `"quote"` segment was pasted with the
     * cursor left INSIDE the quote's own inline content (`setTextCursorPosition(quoteBlock, "end")`
     * still sits inside that quote, not after it as a sibling), merging the
     * next heading/paragraph into the quote's text instead of creating a
     * real separate block. `pasteMarkdown` is stubbed to a no-op — this
     * isn't testing what `pasteMarkdown` itself does with the text (that
     * needs a real `ClipboardEvent`, see the comment on `insertSegments`'
     * "text" branch), only that `insertSegments` hands it a cursor sitting
     * on a fresh, ordinary paragraph — never inside the quote — which is the
     * actual invariant this bug violated.
     */
    it("inserts a fresh empty paragraph before pasting text that follows a quote, instead of pasting inside the quote itself", () => {
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema });
        let cursorBlockTypeAtPasteTime: string | undefined;
        const pasteMarkdownSpy = vi.spyOn(editor, "pasteMarkdown").mockImplementation(() => {
            cursorBlockTypeAtPasteTime = editor.getTextCursorPosition().block.type;
        });

        smartPasteHandler({
            event: fakeClipboardEvent("> A quote\n## A heading"),
            editor: editor as any,
            defaultPasteHandler: () => undefined,
        });

        expect(editor.document.map((b) => b.type)).toEqual(["quote", "paragraph"]);
        expect(editor.document[1]).toMatchObject({ content: [] });
        expect(cursorBlockTypeAtPasteTime).toBe("paragraph");
        expect(pasteMarkdownSpy).toHaveBeenCalledExactlyOnceWith("## A heading");
    });

    /**
     * Same bug, but for the `"fence"` -> `"text"` transition: a `codeSnippet`/
     * `diagram` anchor has `content: "none"` (no inline content at all), so
     * pasting straight into it is even more clearly invalid than the quote
     * case above.
     */
    it("inserts a fresh empty paragraph before pasting text that follows a fenced code block, instead of pasting into the content-less code block", () => {
        const editor = BlockNoteEditor.create({ schema: blockNoteSchema });
        let cursorBlockTypeAtPasteTime: string | undefined;
        const pasteMarkdownSpy = vi.spyOn(editor, "pasteMarkdown").mockImplementation(() => {
            cursorBlockTypeAtPasteTime = editor.getTextCursorPosition().block.type;
        });

        smartPasteHandler({
            event: fakeClipboardEvent("```js\nconst x = 1;\n```\nSome explanatory text"),
            editor: editor as any,
            defaultPasteHandler: () => undefined,
        });

        expect(editor.document.map((b) => b.type)).toEqual(["codeSnippet", "paragraph"]);
        expect(editor.document[1]).toMatchObject({ content: [] });
        expect(cursorBlockTypeAtPasteTime).toBe("paragraph");
        expect(pasteMarkdownSpy).toHaveBeenCalledExactlyOnceWith("Some explanatory text");
    });

    /**
     * Regression test for the bug found in the self-review of the previous
     * session: pasting mid-text left the text AFTER the cursor attached to
     * the original block, landing BEFORE the pasted content instead of
     * after it.
     */
    it("splits the block at the cursor when pasting a fence mid-text, keeping text after the cursor AFTER the paste", () => {
        const editor = BlockNoteEditor.create({
            schema: blockNoteSchema,
            initialContent: [{ type: "paragraph", content: "HelloWorld" }],
        });
        placeCursorAt(editor, editor.document[0], 5); // between "Hello" and "World"

        smartPasteHandler({
            event: fakeClipboardEvent("```js\nconst x = 1;\n```"),
            editor: editor as any,
            defaultPasteHandler: () => undefined,
        });

        expect(editor.document.map((b) => b.type)).toEqual(["paragraph", "codeSnippet", "paragraph"]);
        expect(editor.document[0]).toMatchObject({ content: [{ text: "Hello" }] });
        expect(editor.document[1]).toMatchObject({ props: { language: "js", code: "const x = 1;" } });
        expect(editor.document[2]).toMatchObject({ content: [{ text: "World" }] });
    });

    it("preserves per-run styling (bold) when splitting mid-styled-text at the cursor", () => {
        const editor = BlockNoteEditor.create({
            schema: blockNoteSchema,
            initialContent: [
                {
                    type: "paragraph",
                    content: [
                        { type: "text", text: "plain ", styles: {} },
                        { type: "text", text: "boldtext", styles: { bold: true } },
                    ],
                },
            ],
        });
        // Split inside the bold run, after "bold" but before "text" (6 plain chars + 4 bold chars = offset 10).
        placeCursorAt(editor, editor.document[0], 10);

        smartPasteHandler({
            event: fakeClipboardEvent("> a quote"),
            editor: editor as any,
            defaultPasteHandler: () => undefined,
        });

        expect(editor.document.map((b) => b.type)).toEqual(["paragraph", "quote", "paragraph"]);
        expect(editor.document[0].content).toEqual([
            { type: "text", text: "plain ", styles: {} },
            { type: "text", text: "bold", styles: { bold: true } },
        ]);
        expect(editor.document[2].content).toEqual([{ type: "text", text: "text", styles: { bold: true } }]);
    });

    it("does not split anything when the cursor is at the end of the block (the common case) — no regression", () => {
        const editor = BlockNoteEditor.create({
            schema: blockNoteSchema,
            initialContent: [{ type: "paragraph", content: "Hello" }],
        });
        placeCursorAt(editor, editor.document[0], 5); // exactly at the end

        smartPasteHandler({
            event: fakeClipboardEvent("```js\nconst x = 1;\n```"),
            editor: editor as any,
            defaultPasteHandler: () => undefined,
        });

        expect(editor.document.map((b) => b.type)).toEqual(["paragraph", "codeSnippet"]);
        expect(editor.document[0]).toMatchObject({ content: [{ text: "Hello" }] });
    });

    it("replaces a real (non-collapsed) text selection instead of leaving it untouched next to the paste", () => {
        const editor = BlockNoteEditor.create({
            schema: blockNoteSchema,
            initialContent: [{ type: "paragraph", content: "HelloWorld" }],
        });
        // Select "World" (offsets 5-10) before pasting over it.
        placeCursorAt(editor, editor.document[0], 5);
        editor.transact((tr: Transaction) => {
            tr.setSelection(TextSelection.create(tr.doc, tr.selection.from, tr.selection.from + 5));
        });

        smartPasteHandler({
            event: fakeClipboardEvent("```js\nconst x = 1;\n```"),
            editor: editor as any,
            defaultPasteHandler: () => undefined,
        });

        expect(editor.document.map((b) => b.type)).toEqual(["paragraph", "codeSnippet"]);
        expect(editor.document[0]).toMatchObject({ content: [{ text: "Hello" }] });
    });
});
