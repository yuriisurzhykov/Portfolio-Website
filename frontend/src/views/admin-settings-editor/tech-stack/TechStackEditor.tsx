"use client";

import * as React from "react";
import type { TechIcon } from "@portfolio/backend";
import type { TechIconView } from "@/shared/lib/tech-icons";
import { Text } from "@/shared/ui/text";
import { TechIcon as TechIconRenderer } from "@/shared/ui/tech-icon";
import { createTechRow, type IdentifiedTech } from "./identified-tech";
import { describeIconStatus } from "./icon-status";
import { moveItem } from "./reorder";
import { TechStackQuickAdd } from "./TechStackQuickAdd";
import { TechStackRow } from "./TechStackRow";
import { useResolvedTechIcons } from "./use-resolved-tech-icons";

export interface TechStackEditorProps {
    rows: IdentifiedTech[];
    onChange: (rows: IdentifiedTech[]) => void;
}

/**
 * The tech-stack list, as a list.
 *
 * The previous version rendered every row through the shared
 * `fields/ListEditor` — a full card per technology with a name field, a
 * five-button icon picker with its own live preview, and a two-language
 * note, all expanded, all the time. That's fine for `principles` (four
 * rows of real prose) and wrong for this section, which is a couple of
 * dozen one-word entries: twenty rows meant thousands of pixels of
 * scrolling to do something that is, conceptually, typing twenty words.
 *
 * So this is a different shape, not a restyled `ListEditor`: one line per
 * technology, details on demand, and a single add field that also accepts
 * a pasted list. What it deliberately keeps from `ListEditor` is the
 * "reorder is fully keyboard-operable" property — drag-and-drop is the
 * fast path, ↑/↓ on the grip is the equivalent one, and neither needs a
 * drag-and-drop dependency.
 *
 * It also shows the two things the old editor hid: what the row of logos
 * will actually look like, and which rows resolve to no logo at all — the
 * landing page silently DROPS those (`buildTechStackView`), so "I added
 * it and it never appeared" was previously invisible until you looked at
 * the live site.
 */
export function TechStackEditor({ rows, onChange }: TechStackEditorProps) {
    const [expandedId, setExpandedId] = React.useState<string | null>(null);
    const [dragIndex, setDragIndex] = React.useState<number | null>(null);
    const [overIndex, setOverIndex] = React.useState<number | null>(null);

    const items = rows.map((row) => row.value);
    const { views, failed } = useResolvedTechIcons(items);
    const statuses = items.map((item, index) => describeIconStatus(item.icon, views[index]));

    const hiddenCount = statuses.filter((status) => status.hidden).length;
    const unnamedCount = items.filter((item) => item.name.trim().length === 0).length;

    function updateAt(index: number, patch: Partial<IdentifiedTech["value"]>) {
        onChange(rows.map((row, i) => (i === index ? { ...row, value: { ...row.value, ...patch } } : row)));
    }

    function removeAt(index: number) {
        onChange(rows.filter((_, i) => i !== index));
    }

    function move(from: number, to: number) {
        const next = moveItem(rows, from, to);
        if (next !== rows) {
            onChange([...next]);
        }
    }

    function addRows(entries: { name: string; icon: TechIcon }[]) {
        onChange([...rows, ...entries.map((entry) => createTechRow(entry.name, entry.icon))]);
    }

    function dropEdgeFor(index: number): "top" | "bottom" | null {
        if (dragIndex === null || overIndex !== index || dragIndex === index) {
            return null;
        }
        return dragIndex < index ? "bottom" : "top";
    }

    return (
        <div className="flex flex-col gap-md">
            <TechStackQuickAdd existingNames={items.map((item) => item.name)} onAdd={addRows} />

            <LandingPreview views={views} />

            <div className="flex items-baseline gap-sm flex-wrap">
                <Text variant="caption" tone="secondary" className="font-medium">
                    {items.length === 1 ? "1 technology" : `${ items.length } technologies`}
                </Text>
                {hiddenCount > 0 && (
                    <Text variant="micro" tone="faint" className="normal-case tracking-normal text-status-warning">
                        {hiddenCount === 1 ? "1 row has no logo" : `${ hiddenCount } rows have no logo`} and won&apos;t appear on the site.
                    </Text>
                )}
                {unnamedCount > 0 && (
                    <Text variant="micro" tone="faint" className="normal-case tracking-normal text-status-warning">
                        {unnamedCount === 1 ? "1 row has no name" : `${ unnamedCount } rows have no name`} and won&apos;t be saved.
                    </Text>
                )}
                {failed && (
                    <Text variant="micro" tone="faint" className="normal-case tracking-normal" role="status">
                        Couldn&apos;t load some logo previews — reload to try again. Saving is unaffected.
                    </Text>
                )}
            </div>

            {rows.length === 0 ? (
                <Text variant="caption" tone="faint" className="rounded-md border border-dashed border-border-subtle px-md py-lg text-center">
                    No technologies yet — add the first one above.
                </Text>
            ) : (
                <ul className="flex flex-col gap-xs list-none m-0 p-0">
                    {rows.map((row, index) => (
                        <TechStackRow
                            key={row.id}
                            index={index}
                            item={row.value}
                            view={views[index]}
                            expanded={expandedId === row.id}
                            dropEdge={dropEdgeFor(index)}
                            onToggleExpanded={() => setExpandedId((current) => (current === row.id ? null : row.id))}
                            onChange={(patch) => updateAt(index, patch)}
                            onRemove={() => removeAt(index)}
                            onMoveBy={(delta) => move(index, index + delta)}
                            onDragStart={() => setDragIndex(index)}
                            onDragEnter={() => setOverIndex(index)}
                            onDragEnd={() => {
                                setDragIndex(null);
                                setOverIndex(null);
                            }}
                            onDrop={() => {
                                if (dragIndex !== null) {
                                    move(dragIndex, index);
                                }
                                setDragIndex(null);
                                setOverIndex(null);
                            }}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

/**
 * The same logos, at the same size, in the same order the landing page
 * will render them — including the fact that rows without a resolved logo
 * simply aren't there. Cheap to build (the views are already resolved for
 * the rows above) and it answers the one question the row list can't:
 * "what does this actually look like?"
 */
function LandingPreview({ views }: { views: (TechIconView | null)[] }) {
    const visible = views.filter((view): view is TechIconView => view !== null && view.kind !== "none");
    if (visible.length === 0) {
        return null;
    }
    return (
        <div className="flex flex-col gap-sm rounded-md border border-border-subtle bg-surface-subtle px-md py-sm">
            <Text variant="micro" tone="faint" className="normal-case tracking-normal">
                On the landing page
            </Text>
            <div className="flex flex-wrap items-center gap-x-lg gap-y-md text-text-muted">
                {visible.map((view, index) => (
                    // The size lives on this wrapper, never on `TechIcon`'s own
                    // `className` — see `TechIcon.tsx`'s comment on why a width
                    // utility passed in there doesn't override its internal
                    // `w-full`. Same size the real section uses. `aspect-square
                    // w-auto`, not `w-lg`, since `lg` is a reclaimed width key.
                    // eslint-disable-next-line react/no-array-index-key -- a resolved view has no identity of its own; this list is presentational and never reordered in place.
                    <span key={index} className="block h-lg aspect-square w-auto">
                        <TechIconRenderer icon={view} />
                    </span>
                ))}
            </div>
        </div>
    );
}
