"use client";

import * as React from "react";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { Button } from "@/shared/ui/button";

export interface ListEditorProps<T> {
    label: string;
    hint?: string;
    items: T[];
    onChange: (items: T[]) => void;
    createItem: () => T;
    renderItem: (item: T, index: number, update: (patch: Partial<T>) => void) => React.ReactNode;
    addLabel?: string;
}

/**
 * Generic repeatable-row editor shared by every array-shaped settings
 * section (`principles`, `techStack`, `hero.graphNodes`) — one
 * add/remove/move-up/move-down implementation instead of three near-copies.
 * Reorder is up/down buttons, not drag-and-drop, matching the same
 * reasoning the admin block editor's predecessor used before BlockNote
 * replaced it (see `shared/ui/block-editor/README.md`): no extra
 * dependency, fully keyboard/screen-reader operable, and these lists are
 * short enough (a handful of rows) that drag-and-drop would be more
 * machinery than the UX actually needs.
 *
 * Rows are keyed by array index, not a stable per-item id — `T` (a plain
 * settings row like `{ name, note }`) has no id in storage (`SiteContent`
 * stores the whole array as one JSON value, not individual rows with their
 * own identity), so there's nothing else to key on. This can lose a row's
 * focus/scroll position on reorder, which is an acceptable trade for a
 * single admin editing a handful of rows infrequently, not a hot editing
 * surface.
 */
export function ListEditor<T>({ label, hint, items, onChange, createItem, renderItem, addLabel = "Add item" }: ListEditorProps<T>) {
    function updateAt(index: number, patch: Partial<T>) {
        onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    }

    function removeAt(index: number) {
        onChange(items.filter((_, i) => i !== index));
    }

    function moveAt(index: number, direction: -1 | 1) {
        const target = index + direction;
        if (target < 0 || target >= items.length) {
            return;
        }
        const next = [...items];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    }

    return (
        <div className="flex flex-col gap-md">
            <div>
                <Text variant="caption" tone="secondary" className="font-medium">
                    {label}
                </Text>
                {hint && (
                    <Text variant="micro" tone="faint" className="normal-case tracking-normal">
                        {hint}
                    </Text>
                )}
            </div>

            {items.map((item, index) => (
                // eslint-disable-next-line react/no-array-index-key -- see this component's top comment: no stable id exists to key on.
                <Card key={index} variant="filled" className="p-md flex flex-col gap-sm">
                    <div className="flex items-center justify-between">
                        <Text variant="micro" tone="faint" className="font-mono normal-case tracking-normal">
                            #{index + 1}
                        </Text>
                        <div className="flex items-center gap-xs">
                            <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => moveAt(index, -1)}>
                                Up
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={index === items.length - 1}
                                onClick={() => moveAt(index, 1)}
                            >
                                Down
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeAt(index)}>
                                Remove
                            </Button>
                        </div>
                    </div>
                    {renderItem(item, index, (patch) => updateAt(index, patch))}
                </Card>
            ))}

            <Button type="button" variant="secondary" size="sm" onClick={() => onChange([...items, createItem()])}>
                {addLabel}
            </Button>
        </div>
    );
}
