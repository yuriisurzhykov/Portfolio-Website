import { Markdown } from "@/shared/ui/markdown";
import { Text } from "@/shared/ui/text";
import type { PolicyBlock } from "./policy-document";
import { PolicyTableView } from "./PolicyTableView";

export interface PolicyBlockViewProps {
    block: PolicyBlock;
}

/** One subheading, paragraph, list or table of a policy section. */
export function PolicyBlockView({ block }: PolicyBlockViewProps) {
    switch (block.kind) {
        case "subheading":
            return (
                <Text as="h3" variant="h3" className="m-0 mt-lg">
                    { block.text }
                </Text>
            );
        case "paragraph":
            return (
                <Text className="mt-sm">
                    <Markdown text={ block.text } />
                </Text>
            );
        case "list":
            return (
                <ul className="mt-sm pl-lg list-disc text-body text-text-primary">
                    { block.items.map((item) => (
                        <li key={ item } className="mt-xs">
                            <Markdown text={ item } />
                        </li>
                    )) }
                </ul>
            );
        case "table":
            return <PolicyTableView table={ block.table } />;
    }
}
