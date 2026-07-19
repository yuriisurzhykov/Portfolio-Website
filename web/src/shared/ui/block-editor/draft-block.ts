import type { Block, BlockInput, BlockType } from "@portfolio/backend";
import type { LocalizedTextValue } from "@/shared/ui/form";

const emptyLocalized: LocalizedTextValue = { en: "", ru: "" };

function makeClientId(): string {
    return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

/**
 * The editor's in-memory shape for a block — deliberately NOT the same
 * shape as `Block`/`BlockInput` from `@portfolio/backend`. Two differences,
 * both purely about what a *form* needs that a *stored* block doesn't:
 *
 * 1. `clientId` instead of `id`/`order` — React list identity while
 *    dragging/reordering in the browser; never sent to the server (order
 *    is the array position at save time, see backend's
 *    `replaceDocumentContent`; id is DB-assigned).
 * 2. Every field flattened out of `data`/`text` into top-level, always-a-
 *    string form fields (e.g. `level: 2 | 3` instead of `data?.level`,
 *    `width: string` instead of `data.width: number | undefined`) — so
 *    every input in the block editor can be an uncontrolled-free
 *    controlled `<input value=... onChange=...>` without null-checking
 *    `data` at every keystroke. Conversion to/from the backend's
 *    `Block`/`BlockInput` shape happens only at the editor's boundary
 *    (`blockToDraft`/`draftToBlockInput` below), not scattered through
 *    the field components.
 */
export type DraftBlock =
    | { clientId: string; type: "lead"; text: LocalizedTextValue }
    | { clientId: string; type: "heading"; text: LocalizedTextValue; level: 2 | 3 }
    | { clientId: string; type: "paragraph"; text: LocalizedTextValue }
    | { clientId: string; type: "quote"; text: LocalizedTextValue; attribution: string }
    | { clientId: string; type: "note"; text: LocalizedTextValue; variant: "info" | "warning" | "tip" }
    | { clientId: string; type: "image"; caption: LocalizedTextValue; src: string; alt: LocalizedTextValue; width: string; height: string }
    | { clientId: string; type: "code"; filename: string; language: string; code: string }
    | { clientId: string; type: "approachList"; items: DraftApproachItem[] };

export interface DraftApproachItem {
    clientId: string;
    title: LocalizedTextValue;
    description: LocalizedTextValue;
}

export const BLOCK_TYPE_OPTIONS: { type: BlockType; label: string }[] = [
    { type: "lead", label: "Lead" },
    { type: "heading", label: "Heading" },
    { type: "paragraph", label: "Paragraph" },
    { type: "quote", label: "Quote" },
    { type: "note", label: "Note" },
    { type: "image", label: "Image" },
    { type: "code", label: "Code" },
    { type: "approachList", label: "Approach list" },
];

export function createEmptyDraftBlock(type: BlockType): DraftBlock {
    const clientId = makeClientId();
    switch (type) {
        case "lead":
            return { clientId, type, text: { ...emptyLocalized } };
        case "heading":
            return { clientId, type, text: { ...emptyLocalized }, level: 2 };
        case "paragraph":
            return { clientId, type, text: { ...emptyLocalized } };
        case "quote":
            return { clientId, type, text: { ...emptyLocalized }, attribution: "" };
        case "note":
            return { clientId, type, text: { ...emptyLocalized }, variant: "info" };
        case "image":
            return { clientId, type, caption: { ...emptyLocalized }, src: "", alt: { ...emptyLocalized }, width: "", height: "" };
        case "code":
            return { clientId, type, filename: "", language: "", code: "" };
        case "approachList":
            return { clientId, type, items: [{ clientId: makeClientId(), title: { ...emptyLocalized }, description: { ...emptyLocalized } }] };
    }
}

export function blockToDraft(block: Block): DraftBlock {
    const clientId = makeClientId();
    switch (block.type) {
        case "lead":
            return { clientId, type: "lead", text: block.text };
        case "heading":
            return { clientId, type: "heading", text: block.text, level: block.data?.level ?? 2 };
        case "paragraph":
            return { clientId, type: "paragraph", text: block.text };
        case "quote":
            return { clientId, type: "quote", text: block.text, attribution: block.data?.attribution ?? "" };
        case "note":
            return { clientId, type: "note", text: block.text, variant: block.data.variant };
        case "image":
            return {
                clientId,
                type: "image",
                caption: block.text ?? { ...emptyLocalized },
                src: block.data.src,
                alt: block.data.alt,
                width: block.data.width?.toString() ?? "",
                height: block.data.height?.toString() ?? "",
            };
        case "code":
            return { clientId, type: "code", filename: block.data.filename, language: block.data.language ?? "", code: block.data.code };
        case "approachList":
            return {
                clientId,
                type: "approachList",
                items: block.data.items.map((item) => ({ clientId: makeClientId(), title: item.title, description: item.description })),
            };
    }
}

/** Blank caption (both languages empty) is treated as "no caption" — mirrors how the caption came in as `null`, not an empty-string pair, on read. */
function captionOrUndefined(caption: LocalizedTextValue): LocalizedTextValue | undefined {
    return caption.en.trim() || caption.ru.trim() ? caption : undefined;
}

function parsePositiveInt(raw: string): number | undefined {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function draftToBlockInput(draft: DraftBlock): BlockInput {
    switch (draft.type) {
        case "lead":
            return { type: "lead", text: draft.text };
        case "heading":
            return { type: "heading", text: draft.text, data: { level: draft.level } };
        case "paragraph":
            return { type: "paragraph", text: draft.text };
        case "quote":
            return { type: "quote", text: draft.text, data: draft.attribution.trim() ? { attribution: draft.attribution.trim() } : undefined };
        case "note":
            return { type: "note", text: draft.text, data: { variant: draft.variant } };
        case "image":
            return {
                type: "image",
                text: captionOrUndefined(draft.caption),
                data: {
                    src: draft.src,
                    alt: draft.alt,
                    width: parsePositiveInt(draft.width),
                    height: parsePositiveInt(draft.height),
                },
            };
        case "code":
            return { type: "code", data: { filename: draft.filename, language: draft.language.trim() || undefined, code: draft.code } };
        case "approachList":
            return {
                type: "approachList",
                data: { items: draft.items.map(({ title, description }) => ({ title, description })) },
            };
    }
}

export { makeClientId };
