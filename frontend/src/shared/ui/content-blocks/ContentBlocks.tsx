"use client";

import * as React from "react";
import type { Block, BlockInput, ListItemInput } from "@portfolio/backend";
import { Text } from "@/shared/ui/text";
import { CodeBlock } from "@/shared/ui/code-block";
import { Markdown } from "@/shared/ui/markdown";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import type { CodeLanguage } from "@/shared/lib/highlight/codeHighlighter";
import { Diagram } from "@/shared/ui/diagram";

export interface ContentBlocksProps {
    blocks: Block[];
}

const KNOWN_CODE_LANGUAGES = new Set<CodeLanguage>(["ts", "tsx", "js", "jsx", "kotlin", "kts", "py", "java"]);

/**
 * The database stores `language` as a free-form string (see
 * backend/src/content/blocks.ts — deliberately not constrained to the
 * highlighter's language set, since that set can grow independently of
 * content). Falls back to "ts" for anything the highlighter doesn't
 * recognize, rather than letting `highlightCode` index its language map
 * with a value it was never typed to accept.
 */
function toCodeLanguage(language: string | undefined): CodeLanguage {
    return KNOWN_CODE_LANGUAGES.has(language as CodeLanguage) ? (language as CodeLanguage) : "ts";
}

/**
 * Exported (not just a local const) — `shared/ui/block-editor`'s `NoteBlock`
 * renders the exact same variant→classes mapping inside the admin editor's
 * live preview, so a note looks the same while being written as it will on
 * the published page. One definition instead of two that could drift.
 */
export const noteVariantClasses: Record<"info" | "warning" | "tip", string> = {
    info: "border-border-default bg-surface-base",
    warning: "border-status-warning bg-status-warning-tint-bg",
    tip: "border-accent-solid bg-accent-tint-bg",
};

/**
 * Renders one level of a "list" block's `items`. A plain `<ul>`/`<ol>` per
 * level (not one shared list re-indented with padding) is what lets a
 * nested `<ol>` restart its own numbering from 1, matching standard list
 * semantics.
 *
 * `item.blocks` — EVERYTHING Tab-nested under this item, in its real order
 * (see `blocks.ts`'s comment on `ListItemInput`) — renders via `renderBlock`
 * after the item's own text, keyed by array index (these entries have no
 * `id` of their own, same as `approachList`'s items). A nested sub-list is
 * just another entry in this same array (`renderBlock`'s own `case "list"`
 * recurses back into `<ListItems>` for it, with ITS OWN `ordered` value —
 * not this level's), not a separate field — see `convert.ts`'s comment on
 * why a separate `children` field used to lose both a nested sub-list's own
 * ordered-vs-unordered choice AND its real position relative to other
 * attached content.
 */
function ListItems({items, ordered, ln}: { items: ListItemInput[]; ordered: boolean; ln: Ln }) {
    const ListTag = ordered ? "ol" : "ul";
    return (
        <ListTag className={cn("pl-lg space-y-xs", ordered ? "list-decimal" : "list-disc")}>
            { items.map((item, index) => (
                <li key={ index }>
                    <Text as="span" variant="body" tone="secondary">
                        <Markdown text={ item.text }/>
                    </Text>
                    { item.blocks.map((attached, attachedIndex) => renderBlock(attached, ln, attachedIndex)) }
                </li>
            )) }
        </ListTag>
    );
}

type Ln = (key: string, vars?: Record<string, string | number>) => string;

/**
 * The `switch` this used to be, factored into its own function so it can be
 * reused for a standalone top-level block, inside a grouped run of
 * consecutive `"list"` blocks (see `groupConsecutiveLists` below), AND for
 * a non-list block attached to a list item via `ListItemInput.blocks`
 * (`ListItems` above) — without duplicating a single case. Takes `ln` as a
 * plain argument, not a hook call — this needs to run inside a loop/helper,
 * not as its own component, so it can't call `useTranslation()` itself.
 *
 * Takes `key` as an explicit argument rather than reading `block.id`
 * internally — an ATTACHED block (`ListItemInput.blocks`, a `BlockInput`)
 * has no `id` of its own (same as `approachList`'s items), so this needs to
 * work for both a real `Block` (top-level, keyed by its own `id`) and a
 * `BlockInput` (attached, keyed by its array index) uniformly.
 */
function renderBlock(block: Block | BlockInput, ln: Ln, key: React.Key): React.ReactNode {
    switch (block.type) {
        case "lead":
            return (
                <React.Fragment key={ key }>
                    <Text variant="body-lg" tone="secondary">
                        <Markdown text={ block.text }/>
                    </Text>
                    <hr className="border-t border-border-subtle my-sm"/>
                </React.Fragment>
            );

        case "heading":
            return (
                <Text key={ key } as="h2" variant="h2" className="mt-lg">
                    <Markdown text={ block.text }/>
                </Text>
            );

        case "paragraph":
            return (
                <Text key={ key } variant="body" tone="secondary">
                    <Markdown text={ block.text }/>
                </Text>
            );

        case "quote":
            return (
                <blockquote
                    key={ key }
                    className="border-l-2 border-border-default pl-md italic text-text-secondary"
                >
                    <Markdown text={ block.text }/>
                    { block.data?.attribution && (
                        <Text as="footer" variant="caption" tone="faint" className="mt-xs not-italic">
                            — { block.data.attribution }
                        </Text>
                    ) }
                </blockquote>
            );

        case "note":
            return (
                <div
                    key={ key }
                    className={ cn("rounded-lg border p-md", noteVariantClasses[block.data.variant]) }
                >
                    <Markdown text={ block.text }/>
                </div>
            );

        case "image":
            return (
                <figure key={ key } className="my-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element -- src comes from admin-authored content, not a static/known-at-build-time asset Next.js's <Image> can optimize */ }
                    <img
                        src={ block.data.src }
                        alt={ block.data.alt }
                        width={ block.data.width }
                        height={ block.data.height }
                        className="rounded-lg border border-border-subtle w-full"
                    />
                    { block.text && (
                        <Text as="figcaption" variant="caption" tone="faint" className="mt-xs">
                            <Markdown text={ block.text }/>
                        </Text>
                    ) }
                </figure>
            );

        case "code":
            return (
                <CodeBlock
                    key={ key }
                    title={ block.data.filename }
                    language={ toCodeLanguage(block.data.language) }
                    highlightEnabled
                    showLineNumbers={ false }
                    variant="default"
                    className="my-sm"
                    labels={ {
                        copyButton: ln("label.button.copy"),
                        copiedButton: ln("label.button.copied"),
                        liveRegionCopied: ln("ui.codeBlock.liveRegion.copied"),
                    } }
                >
                    { block.data.code }
                </CodeBlock>
            );

        case "approachList":
            return (
                <div
                    key={ key }
                    className="grid gap-4 mb-7"
                    style={ {gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"} }
                >
                    { block.data.items.map((item, index) => (
                        <div
                            key={ index }
                            className="bg-surface-base border border-border-subtle rounded-lg p-5"
                        >
                            <Text
                                as="div"
                                variant="caption"
                                className="font-mono font-semibold text-accent-text mb-2"
                            >
                                { item.title }
                            </Text>
                            <Text as="div" variant="caption" tone="muted" className="leading-[1.6]">
                                { item.description }
                            </Text>
                        </div>
                    )) }
                </div>
            );
        case "diagram":
            if (!block.data.source) {
                return null;
            }
            return (
                <figure key={ key } className="my-sm">
                    <Diagram engine={ block.data.engine } source={ block.data.source }/>
                    { block.text && (
                        <Text as="figcaption" variant="caption" tone="faint" className="mt-xs">
                            <Markdown text={ block.text }/>
                        </Text>
                    ) }
                </figure>
            );

        case "list":
            return <ListItems key={ key } items={ block.data.items } ordered={ block.data.ordered } ln={ ln }/>;
    }
}

/**
 * `convert.ts`'s save-time grouping splits a list into two adjacent
 * `"list"` blocks the moment the item type changes (bullet <-> numbered)
 * mid-edit — structurally required, since one block only has one `ordered`
 * value. Left to the top-level `gap-md` below, that split would render with
 * a paragraph-sized gap between the two halves, making a single "retype one
 * bullet as numbered" edit look like two unrelated lists. Groups every
 * MAXIMAL run of consecutive `"list"` blocks so the caller can render each
 * run inside one ungapped wrapper instead.
 */
function groupConsecutiveLists(blocks: Block[]): (Block | Block[])[] {
    const groups: (Block | Block[])[] = [];
    for (const block of blocks) {
        const lastGroup = groups[groups.length - 1];
        if (block.type === "list" && Array.isArray(lastGroup)) {
            lastGroup.push(block);
        } else if (block.type === "list") {
            groups.push([block]);
        } else {
            groups.push(block);
        }
    }
    return groups;
}

/**
 * ContentBlocks
 * -------------
 * Renders a post body or case-study narrative from `Block[]` (see
 * backend/src/content/blocks.ts for the shape) — the same renderer for
 * both, since a case study is architecturally just a document (see the
 * migration plan). Authoring content means adding blocks through the
 * admin BlockNote editor, never writing JSX for it.
 *
 * `block.text`/nested `alt`/`title`/`description` are plain strings now,
 * not `{en, ru}` pairs — a block's language is a property of the
 * `Document` it came from (the route already picked the right one via
 * `getPostBySlug(slug, locale)`/`getWorkBySlug(slug, locale)`), not
 * something this component resolves per-field anymore. Only `ln()` (UI
 * chrome — the copy/copied button labels below) still goes through
 * `useTranslation()`.
 */
export function ContentBlocks({blocks}: ContentBlocksProps) {
    const {ln} = useTranslation();

    return (
        <div className="flex flex-col gap-md">
            { groupConsecutiveLists(blocks).map((item) => {
                if (!Array.isArray(item)) {
                    return renderBlock(item, ln, item.id);
                }
                // Every single `"list"` block also arrives here as a
                // length-1 array (not just real multi-block runs) — an
                // extra `flex flex-col` wrapper around one child has no
                // visual effect, so this doesn't need a separate branch
                // for the (far more common) unsplit case.
                return (
                    <div key={ item[0].id } className="flex flex-col">
                        { item.map((block) => renderBlock(block, ln, block.id)) }
                    </div>
                );
            }) }
        </div>
    );
}
