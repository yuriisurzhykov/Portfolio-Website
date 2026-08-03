import { insertOrUpdateBlockForSlashMenu } from "@blocknote/core";
import { type DefaultReactSuggestionItem, getDefaultReactSlashMenuItems } from "@blocknote/react";
import { AlignLeft, Code2, Image as ImageIcon, Info, LayoutGrid, Workflow } from "lucide-react";
import type { PortfolioBlockNoteEditor } from "./schema";

/**
 * `getDefaultReactSlashMenuItems(editor)` only ever produces items for
 * block types it recognizes by name — `paragraph`/`heading`/`quote` here
 * (the three block types in `../schema.ts` that reuse a BlockNote-known
 * type name), automatically respecting the restricted heading levels
 * (2/3) that schema configured. The other six block types
 * (`lead`/`note`/`image`/`code`/`approachList`/`diagram`) have no BlockNote-native
 * equivalent, so they need an explicit slash item each, added here rather
 * than left undiscoverable.
 */
function customSlashMenuItems(editor: PortfolioBlockNoteEditor): DefaultReactSuggestionItem[] {
    return [
        {
            title: "Lead",
            subtext: "Opening line — larger, secondary-toned text",
            aliases: ["lead", "intro"],
            group: "Content blocks",
            icon: <AlignLeft size={ 18 }/>,
            onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, {type: "lead"}),
        },
        {
            title: "Note",
            subtext: "Callout — info, warning, or tip",
            aliases: ["note", "callout", "tip", "warning", "info"],
            group: "Content blocks",
            icon: <Info size={ 18 }/>,
            onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, {type: "note"}),
        },
        {
            title: "Image",
            subtext: "Image by URL, with required alt text",
            aliases: ["image", "picture", "img"],
            group: "Content blocks",
            icon: <ImageIcon size={ 18 }/>,
            onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, {type: "image"}),
        },
        {
            title: "Code",
            subtext: "Code block with a filename",
            aliases: ["code", "codeblock"],
            group: "Content blocks",
            icon: <Code2 size={ 18 }/>,
            // BlockNote-internal type is "codeSnippet", not "code" — see
            // blocks/CodeBlock.tsx's top comment.
            onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, {type: "codeSnippet"}),
        },
        {
            title: "Diagram",
            subtext: "Mermaid or PlantUML diagram, rendered live",
            aliases: ["diagram", "mermaid", "plantuml", "uml", "chart", "flowchart"],
            group: "Content blocks",
            icon: <Workflow size={ 18 }/>,
            onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, {type: "diagram"}),
        },
        {
            title: "Approach list",
            subtext: "Title + description cards",
            aliases: ["approach", "cards", "approachlist"],
            group: "Content blocks",
            icon: <LayoutGrid size={ 18 }/>,
            onItemClick: () =>
                insertOrUpdateBlockForSlashMenu(editor, {
                    type: "approachList",
                    props: {itemsJson: JSON.stringify([{title: "", description: ""}])},
                }),
        },
    ];
}

export function getSlashMenuItems(editor: PortfolioBlockNoteEditor): DefaultReactSuggestionItem[] {
    return [...getDefaultReactSlashMenuItems(editor), ...customSlashMenuItems(editor)];
}
