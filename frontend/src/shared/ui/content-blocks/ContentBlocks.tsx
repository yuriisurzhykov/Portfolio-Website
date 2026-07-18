import * as React from "react";
import { Text } from "@/shared/ui/text";
import { CodeBlock } from "@/shared/ui/code-block";
import { useTranslation } from "@/shared/i18n";
import type { ContentBlock } from "./ContentBlocks.types";

export interface ContentBlocksProps {
    blocks: ContentBlock[];
}

/**
 * ContentBlocks
 * -------------
 * Renders a post/case-study body from typed data blocks. Authoring new
 * long-form content (journal posts, case studies) means appending to a
 * `ContentBlock[]` array in `data/` — no JSX is ever written for it.
 */
export function ContentBlocks({blocks}: ContentBlocksProps) {
    const {ln, pick} = useTranslation();

    return (
        <div className="flex flex-col gap-md">
            { blocks.map((block, index) => {
                switch (block.type) {
                    case "lead":
                        return (
                            <React.Fragment key={ index }>
                                <Text variant="body-lg" tone="secondary">
                                    { pick(block.text) }
                                </Text>
                                <hr className="border-t border-border-subtle my-sm"/>
                            </React.Fragment>
                        );
                    case "heading":
                        return (
                            <Text key={ index } as="h2" variant="h2" className="mt-lg">
                                { pick(block.text) }
                            </Text>
                        );
                    case "code":
                        return (
                            <CodeBlock
                                key={ index }
                                title={ block.filename }
                                language={ block.language ?? "ts" }
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
                                { block.code }
                            </CodeBlock>
                        );
                    case "paragraph":
                    default:
                        return (
                            <Text key={ index } variant="body" tone="secondary">
                                { pick(block.text) }
                            </Text>
                        );
                }
            }) }
        </div>
    );
}
