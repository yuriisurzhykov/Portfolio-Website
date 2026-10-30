"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Field, Input } from "@/shared/ui/form";
import { fuzzyMatchScore } from "@/shared/ui/token-combobox/fuzzy-match";
import type { ComboboxOption, SingleValueComboboxProps } from "./types";

/** One value, with explicit creation only for open-vocabulary fields such as category. */
export function SingleValueCombobox({
    id,
    label,
    hint,
    error,
    value,
    onChange,
    options,
    creatable = false,
    placeholder,
    disabled,
}: SingleValueComboboxProps) {
    const selectedLabel = options.find((option) => option.value === value)?.label ?? (creatable ? (value ?? "") : "");
    const [query, setQuery] = React.useState(selectedLabel);
    const [focused, setFocused] = React.useState(false);
    const [open, setOpen] = React.useState(false);
    const [active, setActive] = React.useState(-1);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const matches = options
        .map((option) => ({ option, score: query.trim() ? fuzzyMatchScore(query.trim(), option.label) : 0 }))
        .filter((item): item is { option: ComboboxOption; score: number } => item.score !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((item) => item.option);
    const candidate = query.trim();
    const canCreate =
        creatable &&
        candidate !== "" &&
        !options.some((option) => option.label.toLowerCase() === candidate.toLowerCase());
    const results = canCreate ? [...matches, { value: candidate, label: `Create "${candidate}"` }] : matches;
    const listId = `${id}-listbox`;

    function commit(option: ComboboxOption | null) {
        setQuery(option ? (options.find((item) => item.value === option.value)?.label ?? option.value) : "");
        setOpen(false);
        setActive(-1);
        onChange(option?.value ?? null);
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive((previous) =>
                results.length === 0
                    ? -1
                    : event.key === "ArrowDown"
                      ? (previous + 1) % results.length
                      : (previous - 1 + results.length) % results.length,
            );
        } else if (event.key === "Enter") {
            event.preventDefault();
            if (open && results[active]) commit(results[active]);
        } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            setActive(-1);
            setQuery(selectedLabel);
        }
    }

    return (
        <Field label={label} htmlFor={id} hint={hint} error={error}>
            <div className="relative">
                <div className="flex items-center gap-xs rounded-md border border-border-default bg-bg-app focus-within:border-border-highlight">
                    <Input
                        ref={inputRef}
                        id={id}
                        role="combobox"
                        appearance="inset"
                        disabled={disabled}
                        aria-expanded={open}
                        aria-controls={open ? listId : undefined}
                        aria-autocomplete="list"
                        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
                        autoComplete="off"
                        value={focused ? query : selectedLabel}
                        placeholder={placeholder}
                        className="min-w-0 border-none focus-visible:ring-0"
                        onFocus={() => {
                            setQuery(selectedLabel);
                            setFocused(true);
                            setOpen(true);
                        }}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setOpen(true);
                            setActive(-1);
                        }}
                        onBlur={() => {
                            setFocused(false);
                            setOpen(false);
                            setActive(-1);
                            setQuery(selectedLabel);
                        }}
                        onKeyDown={handleKeyDown}
                    />
                    {value !== null && (
                        <button
                            type="button"
                            disabled={disabled}
                            aria-label={`Clear ${label}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                                inputRef.current?.focus();
                                commit(null);
                            }}
                            className="px-sm py-sm text-text-muted hover:text-text-primary"
                        >
                            ×
                        </button>
                    )}
                </div>
                {open && (
                    <ul
                        id={listId}
                        role="listbox"
                        aria-label={label}
                        className="absolute inset-x-0 top-full z-overlay mt-xs max-h-(--layout-hero-graph-height) overflow-y-auto rounded-md border border-border-default bg-surface-base p-xs shadow-surface-deep"
                    >
                        {results.length === 0 && (
                            <li className="px-sm py-xs text-caption text-text-muted">No matches</li>
                        )}
                        {results.map((option, index) => (
                            <li
                                key={option.value}
                                id={`${listId}-${index}`}
                                role="option"
                                aria-selected={index === active}
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    commit(option);
                                }}
                                className={cn(
                                    "cursor-pointer rounded-sm px-sm py-sm text-caption",
                                    index === active
                                        ? "bg-accent-tint-bg text-accent-text"
                                        : "text-text-primary hover:bg-surface-raised",
                                )}
                            >
                                {option.label}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Field>
    );
}
