"use client";

import * as React from "react";
import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";
import { cn } from "@/shared/lib/utils";

export interface StatusToggleOption<T extends string> {
    value: T;
    label: string;
    tone: StatusTone;
}

export interface StatusToggleProps<T extends string> {
    value: T;
    onChange: (value: T) => void;
    options: StatusToggleOption<T>[];
}

/**
 * StatusToggle
 * ------------
 * A row of `<StatusBadge>`s that double as the actual control for
 * changing a record's status — not a plain `<Select>` with the status
 * name as text, which is what `PostEditorPage`/`WorkEditorPage` used
 * before. The whole point raised against that version: you couldn't tell
 * "published" from "upcoming" (or "shipped" from "in-progress") at a
 * glance while editing, only by reading the word — the same color-coded
 * pill already used on the public site (`AdminJournalListPage`/
 * `AdminWorkListPage`'s list rows, `WorkDetailPage`'s hero) now doubles as
 * the input control here too, instead of two different representations
 * of the same status existing side by side.
 *
 * Generic over `T` (not hardcoded to `PostStatus`/`WorkStatus`) — both
 * editors need this with a DIFFERENT value type and DIFFERENT tone
 * mapping (`published`/`upcoming` vs. `shipped`/`in-progress`), and there's
 * no shared enum to hang a single non-generic component off of.
 */
export function StatusToggle<T extends string>({ value, onChange, options }: StatusToggleProps<T>) {
    return (
        <div className="flex items-center gap-xs" role="radiogroup">
            {options.map((option) => {
                const isActive = value === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "rounded-pill transition-opacity duration-fast",
                            !isActive && "opacity-50 hover:opacity-80",
                        )}
                    >
                        <StatusBadge tone={isActive ? option.tone : "neutral"} withDot>
                            {option.label}
                        </StatusBadge>
                    </button>
                );
            })}
        </div>
    );
}
