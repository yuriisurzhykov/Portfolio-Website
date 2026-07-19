"use client";

import * as React from "react";
import type { Block } from "@portfolio/backend";
import { Text } from "@/shared/ui/text";
import { CodeBlock } from "@/shared/ui/code-block";
import { Markdown } from "@/shared/ui/markdown";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import type { CodeLanguage } from "@/shared/lib/highlight/codeHighlighter";

export interface ContentBlocksProps {
    blocks: Block[];
}

const KNOWN_CODE_LANGUAGES = new Set<CodeLanguage>(["ts", "tsx", "js", "jsx", "kotlin"]);

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

const noteVariantClasses: Record<"info" | "warning" | "tip", string> = {
    info: "border-border-default bg-surface-base",
    warning: "border-status-warning bg-status-warning-tint-bg",
    tip: "border-accent-solid bg-accent-tint-bg",
};

/**
 * ContentBlocks
 * -------------
 * Renders a post body or case-study narrative from `Block[]` (see
 * backend/src/content/blocks.ts for the shape) — the same renderer for
 * both, since a case study is architecturally just a document (see the
 * migration plan). Authoring content means adding rows through the admin
 * UI (Phase 4), never writing JSX for it.
 */
export function ContentBlocks({ blocks }: ContentBlocksProps) {
    const { ln, pick } = useTranslation();

    return (
        <div className="flex flex-col gap-md">
            {blocks.map((block) => {
                switch (block.type) {
                    case "lead":
                        return (
                            <React.Fragment key={block.id}>
                                <Text variant="body-lg" tone="secondary">
                                    <Markdown text={pick(block.text)} />
                                </Text>
                                <hr className="border-t border-border-subtle my-sm" />
                            </React.Fragment>
                        );

                    case "heading":
                        return (
                            <Text key={block.id} as="h2" variant="h2" className="mt-lg">
                                <Markdown text={pick(block.text)} />
                            </Text>
                        );

                    case "paragraph":
                        return (
                            <Text key={block.id} variant="body" tone="secondary">
                                <Markdown text={pick(block.text)} />
                            </Text>
                        );

                    case "quote":
                        return (
                            <blockquote
                                key={block.id}
                                className="border-l-2 border-border-default pl-md italic text-text-secondary"
                            >
                                <Markdown text={pick(block.text)} />
                                {block.data?.attribution && (
                                    <Text as="footer" variant="caption" tone="faint" className="mt-xs not-italic">
                                        — {block.data.attribution}
                                    </Text>
                                )}
                            </blockquote>
                        );

                    case "note":
                        return (
                            <div
                                key={block.id}
                                className={cn("rounded-lg border p-md", noteVariantClasses[block.data.variant])}
                            >
                                <Markdown text={pick(block.text)} />
                            </div>
                        );

                    case "image":
                        return (
                            <figure key={block.id} className="my-sm">
                                {/* eslint-disable-next-line @next/next/no-img-element -- src comes from admin-authored content, not a static/known-at-build-time asset Next.js's <Image> can optimize */}
                                <img
                                    src={block.data.src}
                                    alt={pick(block.data.alt)}
                                    width={block.data.width}
                                    height={block.data.height}
                                    className="rounded-lg border border-border-subtle w-full"
                                />
                                {block.text && (
                                    <Text as="figcaption" variant="caption" tone="faint" className="mt-xs">
                                        <Markdown text={pick(block.text)} />
                                    </Text>
                                )}
                            </figure>
                        );

                    case "code":
                        return (
                            <CodeBlock
                                key={block.id}
                                title={block.data.filename}
                                language={toCodeLanguage(block.data.language)}
                                highlightEnabled
                                showLineNumbers={false}
                                variant="default"
                                className="my-sm"
                                labels={{
                                    copyButton: ln("label.button.copy"),
                                    copiedButton: ln("label.button.copied"),
                                    liveRegionCopied: ln("ui.codeBlock.liveRegion.copied"),
                                }}
                            >
                                {block.data.code}
                            </CodeBlock>
                        );

                    case "approachList":
                        return (
                            <div
                                key={block.id}
                                className="grid gap-4 mb-7"
                                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
                            >
                                {block.data.items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="bg-surface-base border border-border-subtle rounded-lg p-5"
                                    >
                                        <Text
                                            as="div"
                                            variant="caption"
                                            className="font-mono font-semibold text-accent-text mb-2"
                                        >
                                            {pick(item.title)}
                                        </Text>
                                        <Text as="div" variant="caption" tone="muted" className="leading-[1.6]">
                                            {pick(item.description)}
                                        </Text>
                                    </div>
                                ))}
                            </div>
                        );
                }
            })}
        </div>
    );
}
