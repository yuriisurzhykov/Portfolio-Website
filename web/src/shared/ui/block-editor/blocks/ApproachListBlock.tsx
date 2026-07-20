import { createReactBlockSpec } from "@blocknote/react";
import { Input, Textarea } from "@/shared/ui/form";

export interface ApproachItem {
    title: string;
    description: string;
}

/** `JSON.parse`, defensively — a prop is always a string in BlockNote's `PropSchema` (see `../schema.ts`'s top comment on why every custom block here uses primitive props), there's no structured-array prop type to store a list of `{title, description}` pairs directly. */
export function parseApproachItems(itemsJson: string): ApproachItem[] {
    try {
        const parsed = JSON.parse(itemsJson);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

const EMPTY_ITEM: ApproachItem = { title: "", description: "" };

/**
 * `content: "none"` — same reasoning as `ImageBlock`/`CodeBlock`: this
 * block's real content is a small structured list, not BlockNote rich
 * text, stored JSON-encoded in the single `itemsJson` prop (see
 * `parseApproachItems` above). No BlockNote equivalent exists for this
 * shape at all, so there's no built-in spec to configure — it's fully
 * custom, same UX (add/remove/edit title+description pairs) as the
 * previous admin editor's `ApproachListFields`.
 */
export const ApproachListBlock = createReactBlockSpec(
    { type: "approachList", propSchema: { itemsJson: { default: "[]" } }, content: "none" },
    {
        render: (props) => {
            const items = parseApproachItems(props.block.props.itemsJson);
            const setItems = (next: ApproachItem[]) =>
                props.editor.updateBlock(props.block, { props: { itemsJson: JSON.stringify(next) } });

            return (
                <div className="w-full flex flex-col gap-md p-sm rounded-md border border-border-subtle bg-surface-raised/50" contentEditable={false}>
                    {items.map((item, index) => (
                        <div key={index} className="flex flex-col gap-sm p-sm rounded-md border border-border-subtle bg-surface-base">
                            <div className="flex items-center justify-between">
                                <span className="text-micro font-semibold uppercase tracking-wider text-text-faint">Item {index + 1}</span>
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setItems(items.filter((_, i) => i !== index))}
                                        className="text-micro text-status-error hover:underline"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            <Input
                                value={item.title}
                                onChange={(e) => setItems(items.map((it, i) => (i === index ? { ...it, title: e.target.value } : it)))}
                                placeholder="Title"
                            />
                            <Textarea
                                value={item.description}
                                onChange={(e) => setItems(items.map((it, i) => (i === index ? { ...it, description: e.target.value } : it)))}
                                rows={2}
                                placeholder="Description"
                            />
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => setItems([...items, { ...EMPTY_ITEM }])}
                        className="self-start text-caption font-medium text-accent-text hover:underline"
                    >
                        + Add item
                    </button>
                </div>
            );
        },
    },
);
