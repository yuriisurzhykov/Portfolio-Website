"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Field } from "@/shared/ui/form";
import { fuzzyMatchScore } from "@/shared/ui/token-combobox/fuzzy-match";
import type { RelatedItemOption, RelatedItemPickerProps } from "./RelatedItemPicker.types";

/**
 * related-item-picker
 * --------------------
 * Single-select, searchable picker for choosing an EXISTING Post/Work item
 * — added 2026-08-11 (Work Item Covers & Unified Identity Hue) to replace
 * the bare, unvalidated `<Input>` `PostEditorPage`/`WorkEditorPage` used
 * for `relatedWorkSlug`/`relatedPostSlug` (an admin could type any string,
 * including a typo'd or since-renamed slug, with zero feedback).
 *
 * Deliberately NOT built on top of `TokenCombobox` — that component is a
 * MULTI-value, open-vocabulary free-text-with-suggestions widget (an admin
 * can commit any typed text as a new chip, see its own comment). This
 * widget is the opposite in both dimensions: exactly one value, and every
 * settable value MUST come from `options` — there is no "commit the raw
 * typed text" path at all. Reusing `TokenCombobox` would mean fighting its
 * free-text-commit behavior at every interaction instead of just not
 * having it to begin with.
 *
 * Follows the same ARIA "combobox with list popup" pattern as
 * `TokenCombobox` (keyboard-operable: Arrow Up/Down moves the active
 * option, Enter commits it, Escape closes the dropdown) for a consistent
 * admin experience, but keeps its own, simpler implementation — no chips,
 * no "did you mean" hint, no comma-to-commit.
 */
export function RelatedItemPicker({ id, label, hint, value, onChange, options, placeholder }: RelatedItemPickerProps) {
    const selected = React.useMemo(() => options.find((option) => option.slug === value) ?? null, [options, value]);
    const [inputValue, setInputValue] = React.useState(selected?.label ?? "");
    const [isOpen, setIsOpen] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(-1);
    // Tracks literal DOM focus — deliberately NOT the same thing as `isOpen`
    // (which `commit` below also sets to `false`, on the very same commit
    // that must NOT be undone by the sync effect just below). A click/Enter
    // commit keeps the input focused (the option list's `onMouseDown`
    // explicitly calls `preventDefault()` to guarantee this), so gating the
    // effect on focus rather than `isOpen` lets a commit's own
    // `setInputValue` stick even if the parent's `value` prop hasn't caught
    // up yet by the next render.
    const [isFocused, setIsFocused] = React.useState(false);

    // Keeps the displayed text in sync when the SELECTION changes from
    // outside (e.g. the editor loads a different item, or a parent resets
    // the form) — but never while focused, or a commit's own optimistic
    // `setInputValue` (see `commit` below) would get immediately stomped
    // back to whatever `selected` still resolves to from a not-yet-updated
    // `value` prop.
    React.useEffect(() => {
        if (!isFocused) {
            setInputValue(selected?.label ?? "");
        }
    }, [selected, isFocused]);

    const inputId = `${ id }-input`;
    const listboxId = `${ id }-listbox`;
    const results = React.useMemo(() => searchOptions(inputValue, options), [inputValue, options]);

    function commit(option: RelatedItemOption | null) {
        setIsOpen(false);
        setActiveIndex(-1);
        setInputValue(option?.label ?? "");
        onChange(option?.slug ?? null);
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                setIsOpen(true);
                setActiveIndex((previous) => (previous + 1 < results.length ? previous + 1 : 0));
                return;
            case "ArrowUp":
                event.preventDefault();
                setActiveIndex((previous) => (previous - 1 >= 0 ? previous - 1 : results.length - 1));
                return;
            case "Enter":
                event.preventDefault();
                if (isOpen && activeIndex >= 0 && results[activeIndex]) {
                    commit(results[activeIndex]);
                }
                return;
            case "Escape":
                setIsOpen(false);
                setActiveIndex(-1);
                return;
        }
    }

    return (
        <Field label={label} htmlFor={inputId} hint={hint}>
            <div className="relative">
                <div
                    className={cn(
                        "flex items-center gap-xs rounded-md border border-border-default bg-surface-base p-xs",
                        "transition-colors duration-fast focus-within:border-border-highlight",
                    )}
                >
                    <input
                        id={inputId}
                        role="combobox"
                        aria-expanded={isOpen}
                        aria-controls={listboxId}
                        aria-autocomplete="list"
                        aria-activedescendant={isOpen && activeIndex >= 0 ? `${ listboxId }-option-${ activeIndex }` : undefined}
                        autoComplete="off"
                        value={inputValue}
                        placeholder={placeholder}
                        onChange={(event) => {
                            setInputValue(event.target.value);
                            setIsOpen(true);
                            setActiveIndex(-1);
                        }}
                        onFocus={() => {
                            setIsOpen(true);
                            setIsFocused(true);
                        }}
                        onBlur={() => {
                            // Never commits typed text as a value — reverts
                            // the display back to whatever's actually
                            // SELECTED (or empty) if the admin clicks away
                            // mid-search without picking a real option. The
                            // whole point of this widget is that every value
                            // is a real, validated slug, never free text —
                            // see this component's own top comment.
                            setIsOpen(false);
                            setIsFocused(false);
                            setActiveIndex(-1);
                            setInputValue(selected?.label ?? "");
                        }}
                        onKeyDown={handleKeyDown}
                        className="min-w-[8ch] flex-1 bg-transparent px-sm py-xs text-body outline-none text-text-primary placeholder:text-text-faint"
                    />
                    {selected && (
                        <button
                            type="button"
                            aria-label={`Clear ${ label }`}
                            onClick={() => commit(null)}
                            className="px-sm text-text-muted hover:text-text-primary"
                        >
                            ×
                        </button>
                    )}
                </div>

                {isOpen && results.length > 0 && (
                    <ul
                        id={listboxId}
                        role="listbox"
                        className={cn(
                            "absolute left-0 right-0 top-full z-20 mt-xs",
                            // `bg-surface-base`, not `-raised` — `-raised` is a
                            // near-transparent tint meant to sit ON TOP of an
                            // already-opaque parent (a tag/chip inside a solid
                            // card), not to BE the only backdrop for a floating
                            // popover. In dark theme it's `rgba(255,255,255,.04)`
                            // — close enough to invisible that whatever's on the
                            // page underneath bleeds straight through the option
                            // text, found live from a real screenshot, not by
                            // reading the token's value in isolation.
                            "flex flex-col gap-0.5 rounded-md border border-border-subtle bg-surface-base p-xs shadow-lg",
                        )}
                    >
                        {results.map((result, index) => (
                            <li
                                key={result.slug}
                                id={`${ listboxId }-option-${ index }`}
                                role="option"
                                aria-selected={index === activeIndex}
                                onMouseDown={(event) => {
                                    // Prevents the input's blur (which would
                                    // close the dropdown first) from firing
                                    // before this click is processed — same
                                    // fix `TokenCombobox` uses for the same
                                    // reason.
                                    event.preventDefault();
                                    commit(result);
                                }}
                                className={cn(
                                    "cursor-pointer rounded-sm px-sm py-xs font-mono text-caption",
                                    index === activeIndex ? "bg-accent-tint-bg text-accent-text" : "text-text-primary hover:bg-surface-base",
                                )}
                            >
                                {result.label}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Field>
    );
}

/** A different, simpler fuzzy-search entry point than `TokenCombobox`'s `fuzzySearch` — that one only ever ranks plain strings; this one ranks `{slug, label}` options by their `label` while keeping the `slug` attached, since the caller needs the WHOLE option back to commit a real, validated selection. Reuses the exact same scoring function (`fuzzyMatchScore`), not a second algorithm. */
function searchOptions(query: string, options: readonly RelatedItemOption[], limit = 8): RelatedItemOption[] {
    const trimmed = query.trim();
    if (trimmed === "") {
        return options.slice(0, limit);
    }
    return options
        .map((option) => ({ option, score: fuzzyMatchScore(trimmed, option.label) }))
        .filter((entry): entry is { option: RelatedItemOption; score: number } => entry.score !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((entry) => entry.option);
}
