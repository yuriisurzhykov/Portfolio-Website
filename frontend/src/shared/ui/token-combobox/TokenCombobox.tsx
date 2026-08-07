"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Field } from "@/shared/ui/form";
import { findClosestSuggestion, fuzzySearch } from "./fuzzy-match";
import type { TokenComboboxProps } from "./TokenCombobox.types";

/**
 * token-combobox
 * --------------
 * A chip/tag input with a fuzzy-search dropdown, built from scratch (no
 * combobox library) following the ARIA 1.2 "combobox with list popup"
 * pattern: the text `<input>` carries `role="combobox"` +
 * `aria-expanded`/`aria-controls`/`aria-activedescendant`; the suggestion
 * list is a real `role="listbox"` of `role="option"` elements. Fully
 * keyboard-operable — Arrow Up/Down moves `activeIndex`, Enter commits
 * the active suggestion (or the raw typed text if the dropdown has no
 * active item), Escape closes the dropdown, Backspace on an empty input
 * removes the last chip.
 *
 * Deliberately does NOT restrict `values` to only what's in `suggestions`
 * — see `WorkEditorPage`'s Stack field, this component's first real
 * caller: an admin must be able to type ANY technology, including ones
 * that don't (yet) have a matching `techStack` row. Instead, every
 * committed chip that doesn't closely match a suggestion gets a small,
 * dismissible "did you mean?" hint (`findClosestSuggestion` —
 * deliberately a different, more conservative matcher than the dropdown's
 * `fuzzySearch`, see `fuzzy-match.ts`'s own comment for why one algorithm
 * can't correctly serve both jobs) — softly guiding toward consistent
 * spelling without ever blocking the free-text case.
 */
export function TokenCombobox({ id, label, hint, values, onChange, suggestions, placeholder }: TokenComboboxProps) {
    const [inputValue, setInputValue] = React.useState("");
    const [isOpen, setIsOpen] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(-1);

    const inputId = `${id}-input`;
    const listboxId = `${id}-listbox`;

    const availableSuggestions = React.useMemo(
        () => suggestions.filter((suggestion) => !values.some((value) => value.toLowerCase() === suggestion.toLowerCase())),
        [suggestions, values],
    );
    const results = React.useMemo(() => fuzzySearch(inputValue, availableSuggestions), [inputValue, availableSuggestions]);

    function commitToken(raw: string) {
        const trimmed = raw.trim();
        setInputValue("");
        setActiveIndex(-1);
        setIsOpen(false);
        if (!trimmed) {
            return;
        }
        if (values.some((value) => value.toLowerCase() === trimmed.toLowerCase())) {
            return;
        }
        onChange([...values, trimmed]);
    }

    function removeToken(index: number) {
        onChange(values.filter((_, i) => i !== index));
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
                commitToken(isOpen && activeIndex >= 0 ? results[activeIndex] : inputValue);
                return;
            case ",":
                event.preventDefault();
                commitToken(inputValue);
                return;
            case "Backspace":
                if (inputValue === "" && values.length > 0) {
                    removeToken(values.length - 1);
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
                        "flex flex-wrap items-center gap-xs rounded-md border border-border-default bg-surface-base p-xs",
                        "transition-colors duration-fast focus-within:border-border-highlight",
                    )}
                >
                    {values.map((value, index) => {
                        const suggestedFix = findClosestSuggestion(value, suggestions);
                        return (
                            <span
                                key={`${value}-${index}`}
                                className={cn(
                                    "inline-flex items-center gap-xs rounded-sm border px-sm py-xs font-mono text-micro",
                                    suggestedFix
                                        ? "border-status-warning/40 bg-status-warning-tint-bg text-text-primary"
                                        : "border-border-subtle bg-surface-raised text-text-chip",
                                )}
                                title={suggestedFix ? `Possibly "${suggestedFix}"?` : undefined}
                            >
                                {value}
                                <button
                                    type="button"
                                    aria-label={`Remove ${value}`}
                                    onClick={() => removeToken(index)}
                                    className="text-text-muted hover:text-text-primary"
                                >
                                    ×
                                </button>
                            </span>
                        );
                    })}

                    <input
                        id={inputId}
                        role="combobox"
                        aria-expanded={isOpen}
                        aria-controls={listboxId}
                        aria-autocomplete="list"
                        aria-activedescendant={isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
                        autoComplete="off"
                        value={inputValue}
                        placeholder={values.length === 0 ? placeholder : undefined}
                        onChange={(event) => {
                            setInputValue(event.target.value);
                            setIsOpen(true);
                            setActiveIndex(-1);
                        }}
                        onFocus={() => setIsOpen(true)}
                        onBlur={() => {
                            // Deliberately does NOT commit `inputValue` on
                            // blur — an admin clicking away from a half-typed
                            // value shouldn't silently add it as a stack
                            // entry. The dropdown just closes; the typed text
                            // stays in the input until an explicit
                            // Enter/comma/click commits it or the field is
                            // focused again.
                            setIsOpen(false);
                            setActiveIndex(-1);
                        }}
                        onKeyDown={handleKeyDown}
                        className="min-w-[8ch] flex-1 bg-transparent text-body outline-none text-text-primary placeholder:text-text-faint"
                    />
                </div>

                {isOpen && results.length > 0 && (
                    <ul
                        id={listboxId}
                        role="listbox"
                        className={cn(
                            "absolute left-0 right-0 top-full z-20 mt-xs",
                            "flex flex-col gap-[2px] rounded-md border border-border-subtle bg-surface-raised p-xs shadow-lg",
                        )}
                    >
                        {results.map((result, index) => (
                            <li
                                key={result}
                                id={`${listboxId}-option-${index}`}
                                role="option"
                                aria-selected={index === activeIndex}
                                onMouseDown={(event) => {
                                    // Prevents the input's blur (which would
                                    // close the dropdown) from firing before
                                    // this click is processed — the standard
                                    // combobox "click an option without
                                    // losing focus" fix.
                                    event.preventDefault();
                                    commitToken(result);
                                }}
                                className={cn(
                                    "cursor-pointer rounded-sm px-sm py-xs font-mono text-caption",
                                    index === activeIndex ? "bg-accent-tint-bg text-accent-text" : "text-text-primary hover:bg-surface-base",
                                )}
                            >
                                {result}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Field>
    );
}
