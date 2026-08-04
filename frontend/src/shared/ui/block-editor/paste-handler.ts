import { getBlockInfoFromTransaction } from "@blocknote/core";
import type { PortfolioBlock } from "./convert";
import { markdownToInlineContent } from "./convert";
import { blockNoteSchema, type PortfolioBlockNoteEditor } from "./schema";

type PortfolioPartialBlock = typeof blockNoteSchema.PartialBlock;
type InlineContent = PortfolioBlock["content"];
type InlineContentItem = Exclude<InlineContent, undefined>[number];

export type PasteSegment =
    | { kind: "fence"; language: string; code: string }
    | { kind: "quote"; text: string }
    | { kind: "text"; text: string };

/**
 * Splits pasted plain text into runs the default paste pipeline already
 * handles well (`"text"` — BlockNote's own `pasteMarkdown` already turns
 * headings/bold/italic/links/lists into real blocks once `schema.ts`
 * registers the matching type names, see `README.md`) and the two kinds it
 * doesn't, because this editor's schema uses custom type names instead of
 * BlockNote's native ones for them (see `schema.ts`'s top comment): fenced
 * code blocks (` ```lang ... ``` `, including ` ```mermaid `/` ```plantuml `)
 * and blockquotes (consecutive `> ` lines) — verified live, not assumed:
 * `editor.tryParseMarkdownToBlocks` on either currently produces a plain
 * paragraph (a fence even downgrades to inline `` `code` `` styling, not a
 * real code block) with no trace of "this was code" or "this was a quote"
 * left at all.
 *
 * Line-oriented, not a single global regex — mirrors how CommonMark itself
 * decides block boundaries: a fence's own content must never be re-scanned
 * for `> ` lines inside it, which a regex combining both patterns in one
 * pass could not guarantee without becoming unreadable.
 */
export function splitPastedMarkdown(source: string): PasteSegment[] {
    const lines = source.split("\n");
    const segments: PasteSegment[] = [];
    let textLines: string[] = [];

    function flushText() {
        if (textLines.length > 0) {
            segments.push({ kind: "text", text: textLines.join("\n") });
            textLines = [];
        }
    }

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const fenceMatch = /^```([^\n`]*)$/.exec(line.trim());

        if (fenceMatch) {
            flushText();
            const language = fenceMatch[1].trim();
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && lines[i].trim() !== "```") {
                codeLines.push(lines[i]);
                i++;
            }
            // Skips the closing fence line if one was actually found — an
            // unterminated fence (a partial snippet) still keeps
            // everything collected so far, rather than silently dropping it.
            if (i < lines.length) {
                i++;
            }
            segments.push({ kind: "fence", language, code: codeLines.join("\n") });
            continue;
        }

        if (/^>\s?/.test(line)) {
            flushText();
            const quoteLines: string[] = [];
            while (i < lines.length && /^>\s?/.test(lines[i])) {
                quoteLines.push(lines[i].replace(/^>\s?/, ""));
                i++;
            }
            segments.push({ kind: "quote", text: quoteLines.join("\n") });
            continue;
        }

        textLines.push(line);
        i++;
    }
    flushText();

    return segments;
}

const DIAGRAM_ENGINES = new Set(["mermaid", "plantuml"]);

function fenceToBlock(segment: { language: string; code: string }): PortfolioPartialBlock {
    const language = segment.language.toLowerCase();
    if (DIAGRAM_ENGINES.has(language)) {
        return {
            type: "diagram",
            props: { engine: language as "mermaid" | "plantuml", source: segment.code, caption: "" },
        } as PortfolioPartialBlock;
    }
    // Filename is left blank — pasted code has no filename to infer one
    // from; the admin can fill it in same as after inserting via the
    // slash menu.
    return {
        type: "codeSnippet",
        props: { filename: "", language: segment.language, code: segment.code },
    } as PortfolioPartialBlock;
}

function quoteToBlock(editor: PortfolioBlockNoteEditor, text: string): PortfolioPartialBlock {
    return { type: "quote", content: markdownToInlineContent(editor, text) } as PortfolioPartialBlock;
}

function isEmptyParagraph(block: PortfolioBlock): boolean {
    return block.type === "paragraph" && Array.isArray(block.content) && block.content.length === 0;
}

/**
 * Splits one inline-content run at a character offset, preserving each
 * run's own styles — a plain flatten-to-string-and-reslice would silently
 * drop bold/italic/link boundaries that don't align with the split point.
 * Never splits INSIDE a `"link"` item (its own nested styled-text run) —
 * the whole link goes to whichever side the split point falls into,
 * snapping to before it, rather than risking a malformed half-link.
 */
function splitInlineContentAt(content: InlineContentItem[], offset: number): [InlineContentItem[], InlineContentItem[]] {
    const before: InlineContentItem[] = [];
    const after: InlineContentItem[] = [];
    let consumed = 0;

    for (const item of content) {
        const itemText = item.type === "text" ? item.text : item.content.map((c) => c.text).join("");
        const itemEnd = consumed + itemText.length;

        if (itemEnd <= offset) {
            before.push(item);
        } else if (consumed >= offset || item.type !== "text") {
            after.push(item);
        } else {
            const localOffset = offset - consumed;
            before.push({ ...item, text: itemText.slice(0, localOffset) });
            after.push({ ...item, text: itemText.slice(localOffset) });
        }
        consumed = itemEnd;
    }

    return [before, after];
}

/**
 * If the cursor sits at the very end of the current block's content (the
 * common "pasted on a blank/fresh line" case), returns it unchanged —
 * `insertSegments` below already handles that correctly. Otherwise splits
 * the block in place at the cursor, so text after the cursor ends up
 * AFTER everything about to be pasted instead of staying attached to the
 * original block (and so appearing BEFORE the paste — the actual bug this
 * fixes).
 *
 * Deliberately does NOT use raw `tr.split()` — verified live that it
 * throws `Invalid content for node blockContainer` against BlockNote's own
 * nested block schema (a plain ProseMirror split doesn't know BlockNote's
 * block-wrapping rules). BlockNote's own block-aware split command
 * (`splitBlockCommand`) exists internally but isn't part of the package's
 * public `exports` map, so it can't be imported reliably. Slicing
 * `content` directly and using the same public `updateBlock`/`insertBlocks`
 * primitives already used elsewhere in this file avoids the whole problem.
 */
function splitAnchorAtCursor(editor: PortfolioBlockNoteEditor, anchor: PortfolioBlock): PortfolioBlock {
    if (!Array.isArray(anchor.content)) {
        // A `content: "none"` block (image/code/diagram/approachList) has
        // no cursor position inside it in the first place — nothing to split.
        return anchor;
    }

    const cursorInfo = editor.transact((tr) => {
        const blockInfo = getBlockInfoFromTransaction(tr);
        // Always true for a block with `content: "inline"` (the only kind
        // this function is ever called with — guarded above) — narrowed
        // explicitly since `blockContent` only exists on this branch of
        // `BlockInfo`'s union.
        if (!blockInfo.isBlockContainer) {
            return null;
        }
        const contentStart = blockInfo.blockContent.beforePos + 1;
        return {
            offset: tr.selection.from - contentStart,
            atEnd: tr.selection.from === blockInfo.blockContent.afterPos - 1,
        };
    });
    if (!cursorInfo || cursorInfo.atEnd) {
        return anchor;
    }
    const { offset } = cursorInfo;

    const [before, after] = splitInlineContentAt(anchor.content as InlineContentItem[], offset);
    const updatedAnchor = editor.updateBlock(anchor, { content: before, children: [] } as PortfolioPartialBlock) as PortfolioBlock;
    editor.insertBlocks(
        [{ type: anchor.type, props: anchor.props, content: after, children: anchor.children } as PortfolioPartialBlock],
        updatedAnchor,
        "after",
    );
    return updatedAnchor;
}

/**
 * Inserts every segment in order, advancing an "anchor" block as it goes.
 * `"text"` segments go through `editor.pasteMarkdown` at the anchor (the
 * exact same call the default plain-text paste pipeline itself makes —
 * see `fromClipboard/pasteExtension.ts`), so headings/bold/lists inside
 * them still get full standard treatment; `"fence"`/`"quote"` segments
 * become one real `codeSnippet`/`diagram`/`quote` block each via
 * `insertBlocks`.
 *
 * The very first non-text segment overwrites the anchor in place via
 * `updateBlock` INSTEAD of inserting after it, but only when that anchor
 * is an empty paragraph (the common "pasted onto a blank line" case) —
 * `insertBlocks` only ever ADDS blocks, so without this, pasting a fenced
 * snippet onto an empty line would leave that empty paragraph behind as a
 * stray blank line above the real content.
 */
function insertSegments(editor: PortfolioBlockNoteEditor, segments: PasteSegment[]): void {
    // A real (non-collapsed) selection at paste time should be replaced,
    // the same as typing over highlighted text would — without this,
    // pasted content would land elsewhere while the highlighted text sits
    // untouched.
    editor.transact((tr) => {
        if (!tr.selection.empty) {
            tr.deleteSelection();
        }
    });

    let anchor = splitAnchorAtCursor(editor, editor.getTextCursorPosition().block);
    let firstNonTextSegment = true;
    // True right after inserting a fence/quote block — see this function's
    // doc comment for why that specific anchor is never safe to paste into
    // directly.
    let anchorIsFenceOrQuote = false;

    for (const segment of segments) {
        if (segment.kind === "text") {
            if (!segment.text.trim()) {
                continue;
            }
            if (anchorIsFenceOrQuote) {
                [anchor] = editor.insertBlocks(
                    [{ type: "paragraph", content: [] } as PortfolioPartialBlock],
                    anchor,
                    "after",
                ) as PortfolioBlock[];
            }
            editor.setTextCursorPosition(anchor, "end");
            // Not exercised by any automated test — jsdom has no
            // `ClipboardEvent` global, and this call reaches real
            // ProseMirror clipboard code that constructs one (confirmed by
            // running it: `ReferenceError: ClipboardEvent is not defined`,
            // see paste-handler.test.ts's comment on its last test).
            // Manually verified in a real browser instead — see the
            // block-editor README's "Тесты и проверка" section for the same
            // documented jsdom limitation on mounted-editor behavior.
            editor.pasteMarkdown(segment.text);
            anchor = editor.getTextCursorPosition().block;
            anchorIsFenceOrQuote = false;
            continue;
        }

        const block = segment.kind === "fence" ? fenceToBlock(segment) : quoteToBlock(editor, segment.text);

        if (firstNonTextSegment && isEmptyParagraph(anchor)) {
            anchor = editor.updateBlock(anchor, block) as PortfolioBlock;
        } else {
            [anchor] = editor.insertBlocks([block], anchor, "after") as PortfolioBlock[];
        }
        firstNonTextSegment = false;
        anchorIsFenceOrQuote = true;
    }
}

interface PasteHandlerContext {
    event: ClipboardEvent;
    editor: PortfolioBlockNoteEditor;
    defaultPasteHandler: (context?: {
        prioritizeMarkdownOverHTML?: boolean;
        plainTextAsMarkdown?: boolean;
    }) => boolean | undefined;
}

/**
 * `useCreateBlockNote`'s `pasteHandler` option (see `BlockNoteEditor.tsx`).
 * Only steps in when the pasted plain text actually contains a fence or a
 * blockquote — anything else (including a paste BlockNote already handles
 * well: rich HTML from another app, a plain markdown heading/list) falls
 * straight through to `defaultPasteHandler()`, unchanged from BlockNote's
 * own default behavior.
 */
export function smartPasteHandler({ event, editor, defaultPasteHandler }: PasteHandlerContext): boolean | undefined {
    const plainText = event.clipboardData?.getData("text/plain");
    if (!plainText) {
        return defaultPasteHandler();
    }

    const segments = splitPastedMarkdown(plainText);
    const needsCustomHandling = segments.some((segment) => segment.kind !== "text");
    if (!needsCustomHandling) {
        return defaultPasteHandler();
    }

    insertSegments(editor, segments);
    return true;
}
