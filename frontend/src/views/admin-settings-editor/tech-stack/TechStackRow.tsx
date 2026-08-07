"use client";

import * as React from "react";
import { ChevronDown, GripVertical, X } from "lucide-react";
import type { TechIconView } from "@/shared/lib/tech-icons";
import { cn } from "@/shared/lib/utils";
import { TechIcon as TechIconRenderer } from "@/shared/ui/tech-icon";
import { BilingualField } from "../fields/BilingualField";
import { TechIconPickerField } from "../fields/TechIconPickerField";
import { describeIconStatus } from "./icon-status";
import type { TechStackItem } from "./identified-tech";

export interface TechStackRowProps {
    index: number;
    item: TechStackItem;
    /** `null` while this row's logo is still being resolved — see `useResolvedTechIcons`. */
    view: TechIconView | null;
    expanded: boolean;
    /** Where a dragged row would land relative to this one, if anywhere — drawn as a single insertion line, so the drop target is never ambiguous. */
    dropEdge: "top" | "bottom" | null;
    onToggleExpanded: () => void;
    onChange: (patch: Partial<TechStackItem>) => void;
    onRemove: () => void;
    onMoveBy: (delta: -1 | 1) => void;
    onDragStart: () => void;
    onDragEnter: () => void;
    onDragEnd: () => void;
    onDrop: () => void;
}

const statusToneClasses = {
    neutral: "border-border-subtle bg-surface-raised text-text-muted",
    warning: "border-status-warning/40 bg-status-warning-tint-bg text-status-warning",
    pending: "border-transparent text-text-faint",
} as const;

/**
 * One technology, in one 48px-tall line: reorder handle, live logo, its
 * name (edited in place — no "open a form to change a word"), what the
 * logo resolved to, and remove. Everything else about a row — the icon
 * override and the reference note, neither of which most rows ever need —
 * lives behind the disclosure and is closed by default. That collapse is
 * the entire difference between a 20-row list you can see at once and the
 * ~8000px of stacked cards this replaced.
 *
 * `draggable` is toggled on only while the grip is actually held: set
 * permanently on the row, it hijacks text selection inside the name
 * input, since the input is a descendant of the draggable element.
 * Keyboard users get the same reordering from the grip itself (↑/↓),
 * which is why the grip is a real `<button>` and not a decorative span.
 */
export function TechStackRow({
    index,
    item,
    view,
    expanded,
    dropEdge,
    onToggleExpanded,
    onChange,
    onRemove,
    onMoveBy,
    onDragStart,
    onDragEnter,
    onDragEnd,
    onDrop,
}: TechStackRowProps) {
    const [draggable, setDraggable] = React.useState(false);
    const status = describeIconStatus(item.icon, view);
    const label = item.name.trim() || `row ${ index + 1 }`;
    const detailsId = `tech-details-${ index }`;

    function handleGripKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
        if (event.key === "ArrowUp") {
            event.preventDefault();
            onMoveBy(-1);
        } else if (event.key === "ArrowDown") {
            event.preventDefault();
            onMoveBy(1);
        }
    }

    return (
        <li
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnter={onDragEnter}
            onDragOver={(event) => event.preventDefault()}
            onDragEnd={() => {
                setDraggable(false);
                onDragEnd();
            }}
            onDrop={(event) => {
                event.preventDefault();
                setDraggable(false);
                onDrop();
            }}
            className={cn(
                "rounded-md border border-border-subtle bg-surface-base",
                dropEdge === "top" && "border-t-2 border-t-accent-solid",
                dropEdge === "bottom" && "border-b-2 border-b-accent-solid",
                draggable && "opacity-60",
            )}
        >
            <div className="flex items-center gap-sm pl-xs pr-sm h-12">
                <button
                    type="button"
                    aria-label={`Reorder ${ label }. Press arrow up or arrow down to move it.`}
                    onPointerDown={() => setDraggable(true)}
                    onPointerUp={() => setDraggable(false)}
                    onKeyDown={handleGripKeyDown}
                    className="shrink-0 cursor-grab rounded-sm p-1 text-text-faint hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-highlight"
                >
                    <GripVertical aria-hidden className="w-4 h-4" />
                </button>

                <span
                    aria-hidden
                    className="grid place-items-center shrink-0 w-8 h-8 rounded-sm bg-surface-icon p-1.5 text-text-primary"
                >
                    <TechIconRenderer icon={view ?? { kind: "none" }} />
                </span>

                <input
                    aria-label={`Name of ${ label }`}
                    value={item.name}
                    onChange={(event) => onChange({ name: event.target.value })}
                    placeholder="Technology name"
                    className="min-w-0 flex-1 bg-transparent text-body text-text-primary outline-none placeholder:text-text-faint"
                />

                <span
                    className={cn(
                        "shrink-0 rounded-sm border px-sm py-[2px] font-mono text-micro",
                        statusToneClasses[status.tone],
                    )}
                >
                    {status.label}
                </span>

                <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={detailsId}
                    aria-label={`Icon and note for ${ label }`}
                    onClick={onToggleExpanded}
                    className="shrink-0 rounded-sm p-1 text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-highlight"
                >
                    <ChevronDown aria-hidden className={cn("w-4 h-4 transition-transform duration-fast", expanded && "rotate-180")} />
                </button>

                <button
                    type="button"
                    aria-label={`Remove ${ label }`}
                    onClick={onRemove}
                    className="shrink-0 rounded-sm p-1 text-text-faint hover:text-status-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-highlight"
                >
                    <X aria-hidden className="w-4 h-4" />
                </button>
            </div>

            {expanded && (
                <div id={detailsId} className="flex flex-col gap-md border-t border-border-subtle px-md py-md">
                    <TechIconPickerField
                        idPrefix={`tech-icon-${ index }`}
                        value={item.icon}
                        onChange={(icon) => onChange({ icon })}
                    />
                    <BilingualField
                        label="Note"
                        hint="Not shown anywhere on the site — kept for your own reference."
                        required={false}
                        idPrefix={`tech-note-${ index }`}
                        en={item.note.en}
                        ru={item.note.ru}
                        onEnChange={(value) => onChange({ note: { ...item.note, en: value } })}
                        onRuChange={(value) => onChange({ note: { ...item.note, ru: value } })}
                    />
                </div>
            )}
        </li>
    );
}
