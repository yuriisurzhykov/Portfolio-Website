"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";

export interface SegmentedToggleProps<T extends string> {
    options: ReadonlyArray<{ value: T; label: string }>;
    value: T;
    onChange: (value: T) => void;
}

/**
 * The same pill-toggle look as widgets/nav/ThemeSegmentedToggle.tsx and this editor's own
 * NoteBlock variant picker - one visual pattern for "pick one of a few options inline,"
 * reused by DiagramBlock (engine, edit/preview) and LinkCardBlock (row/card) rather than inventing a
 * new control for each.
 * */
export function SegmentedToggle<T extends string>({ options, value, onChange }: SegmentedToggleProps<T>) {
    return (
        <div className="flex items-center gap-0.5 bg-surface-icon border border-border-subtle rounded-pill p-xxs"
             contentEditable={ false }>
            { options.map((option) => {
                const isActive = value === option.value;
                return (
                    <button
                        key={ option.value }
                        type="button"
                        onClick={ () => onChange(option.value) }
                        aria-pressed={ isActive }
                        className={ cn(
                            "rounded-pill px-sm py-xxs",
                            "font-mono font-semibold text-micro uppercase",
                            "transition-colors duration-fast",
                            isActive ? "bg-text-primary text-bg-app" : "text-text-muted hover:text-text-primary",
                        ) }
                    >
                        { option.label }
                    </button>
                );
            }) }
        </div>
    );
}
