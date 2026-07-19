import { Field, Input, LocalizedInputField, LocalizedTextareaField, Select, Textarea } from "@/shared/ui/form";
import type { DraftApproachItem, DraftBlock } from "./draft-block";
import { makeClientId } from "./draft-block";

interface BlockFieldsProps {
    draft: DraftBlock;
    onChange: (next: DraftBlock) => void;
}

/**
 * One `<Field>`-based mini-form per block type — switches on `draft.type`
 * the same way `web`'s `<ContentBlocks>` (the read-side renderer) switches
 * on `Block.type`. Kept as a single component with a switch, not eight
 * separate exported components, since `BlockListEditor` never needs to
 * pick a field editor any way other than by the block's own type.
 */
export function BlockFields({ draft, onChange }: BlockFieldsProps) {
    switch (draft.type) {
        case "lead":
        case "paragraph":
            return (
                <LocalizedTextareaField
                    label="Text (Markdown)"
                    value={draft.text}
                    onChange={(text) => onChange({ ...draft, text })}
                    rows={3}
                />
            );

        case "heading":
            return (
                <div className="flex flex-col gap-md">
                    <LocalizedInputField label="Text" value={draft.text} onChange={(text) => onChange({ ...draft, text })} />
                    <Field label="Level" className="max-w-[160px]">
                        <Select
                            value={draft.level}
                            onChange={(e) => onChange({ ...draft, level: Number(e.target.value) as 2 | 3 })}
                        >
                            <option value={2}>H2</option>
                            <option value={3}>H3</option>
                        </Select>
                    </Field>
                </div>
            );

        case "quote":
            return (
                <div className="flex flex-col gap-md">
                    <LocalizedTextareaField label="Text (Markdown)" value={draft.text} onChange={(text) => onChange({ ...draft, text })} rows={3} />
                    <Field label="Attribution" hint="Who said it — optional.">
                        <Input value={draft.attribution} onChange={(e) => onChange({ ...draft, attribution: e.target.value })} />
                    </Field>
                </div>
            );

        case "note":
            return (
                <div className="flex flex-col gap-md">
                    <LocalizedTextareaField label="Text (Markdown)" value={draft.text} onChange={(text) => onChange({ ...draft, text })} rows={3} />
                    <Field label="Variant" className="max-w-[160px]">
                        <Select value={draft.variant} onChange={(e) => onChange({ ...draft, variant: e.target.value as typeof draft.variant })}>
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="tip">Tip</option>
                        </Select>
                    </Field>
                </div>
            );

        case "image":
            return (
                <div className="flex flex-col gap-md">
                    <Field label="Image URL">
                        <Input value={draft.src} onChange={(e) => onChange({ ...draft, src: e.target.value })} placeholder="/images/foo.png" />
                    </Field>
                    <LocalizedInputField label="Alt text" value={draft.alt} onChange={(alt) => onChange({ ...draft, alt })} required />
                    <LocalizedInputField label="Caption (optional)" value={draft.caption} onChange={(caption) => onChange({ ...draft, caption })} />
                    <div className="grid grid-cols-2 gap-sm max-w-[280px]">
                        <Field label="Width (px)">
                            <Input type="number" min={1} value={draft.width} onChange={(e) => onChange({ ...draft, width: e.target.value })} />
                        </Field>
                        <Field label="Height (px)">
                            <Input type="number" min={1} value={draft.height} onChange={(e) => onChange({ ...draft, height: e.target.value })} />
                        </Field>
                    </div>
                </div>
            );

        case "code":
            return (
                <div className="flex flex-col gap-md">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
                        <Field label="Filename">
                            <Input value={draft.filename} onChange={(e) => onChange({ ...draft, filename: e.target.value })} placeholder="Example.kt" />
                        </Field>
                        <Field label="Language" hint="Optional — e.g. kotlin, ts, bash.">
                            <Input value={draft.language} onChange={(e) => onChange({ ...draft, language: e.target.value })} />
                        </Field>
                    </div>
                    <Field label="Code">
                        <Textarea
                            value={draft.code}
                            onChange={(e) => onChange({ ...draft, code: e.target.value })}
                            rows={8}
                            resizable
                            className="font-mono text-caption"
                        />
                    </Field>
                </div>
            );

        case "approachList":
            return (
                <ApproachListFields
                    items={draft.items}
                    onChange={(items) => onChange({ ...draft, items })}
                />
            );
    }
}

function ApproachListFields({ items, onChange }: { items: DraftApproachItem[]; onChange: (items: DraftApproachItem[]) => void }) {
    function updateItem(clientId: string, next: Partial<Omit<DraftApproachItem, "clientId">>) {
        onChange(items.map((item) => (item.clientId === clientId ? { ...item, ...next } : item)));
    }

    function removeItem(clientId: string) {
        onChange(items.filter((item) => item.clientId !== clientId));
    }

    function addItem() {
        onChange([...items, { clientId: makeClientId(), title: { en: "", ru: "" }, description: { en: "", ru: "" } }]);
    }

    return (
        <div className="flex flex-col gap-md">
            {items.map((item, index) => (
                <div key={item.clientId} className="flex flex-col gap-sm p-sm rounded-md border border-border-subtle bg-surface-raised/50">
                    <div className="flex items-center justify-between">
                        <span className="text-micro font-semibold uppercase tracking-wider text-text-faint">Item {index + 1}</span>
                        {items.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removeItem(item.clientId)}
                                className="text-micro text-status-error hover:underline"
                            >
                                Remove
                            </button>
                        )}
                    </div>
                    <LocalizedInputField label="Title" value={item.title} onChange={(title) => updateItem(item.clientId, { title })} />
                    <LocalizedTextareaField label="Description" value={item.description} onChange={(description) => updateItem(item.clientId, { description })} rows={2} />
                </div>
            ))}
            <button
                type="button"
                onClick={addItem}
                className="self-start text-caption font-medium text-accent-text hover:underline"
            >
                + Add item
            </button>
        </div>
    );
}
