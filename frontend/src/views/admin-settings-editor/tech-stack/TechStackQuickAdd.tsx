"use client";

import * as React from "react";
import { Plus, Search } from "lucide-react";
import type { TechIcon } from "@portfolio/backend";
import type { BrandIconSearchResult } from "@/shared/lib/tech-icons";
import { adminApi } from "@/shared/lib/admin-api";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Field, inputBaseStyles } from "@/shared/ui/form";
import { Text } from "@/shared/ui/text";
import { TechIcon as TechIconRenderer } from "@/shared/ui/tech-icon";
import { describeAddResult, parseTechNames, splitNewNames } from "./parse-tech-input";

const SEARCH_DEBOUNCE_MS = 180;
const MAX_SUGGESTIONS = 6;

/** Terse on purpose: `Field` renders a hint through `Text variant="micro"`, which is uppercase across this design system — a full two-line sentence in caps is genuinely hard to read. */
const HINT = "Enter adds it · paste a list to add many · ↓ picks an exact logo";

export interface TechStackQuickAddProps {
    /** Existing row names — used only to skip duplicates and say so; this component never reads or writes the list itself. */
    existingNames: readonly string[];
    onAdd: (entries: { name: string; icon: TechIcon }[]) => void;
}

/**
 * The whole reason this editor exists: adding a technology is one line of
 * typing, and adding twenty is one paste.
 *
 * Three ways in, all through the same field:
 * - Type a name, press Enter → a row with `icon: { type: "auto" }`, which
 *   resolves its own logo from the name in the overwhelming majority of
 *   cases ("Kotlin", "Docker", "PostgreSQL", …).
 * - Press ↓ first and pick a catalog result → a row pinned to that exact
 *   Simple Icons slug (`type: "brand"`), for the cases where guessing
 *   from the name can't work ("Amazon Web Services" → `amazonaws`).
 * - Paste "Kotlin, Docker, Redis, …" (commas, newlines, semicolons, tabs)
 *   → every name at once, each `auto`.
 *
 * Focus stays in the field after every add, and the field clears itself —
 * so twenty technologies is twenty words and twenty Enters, not twenty
 * trips through a form.
 *
 * ARIA 1.2 "combobox with list popup", hand-rolled the same way
 * `shared/ui/token-combobox` does it (same reasoning: one field, no
 * dependency) — `role="combobox"` + `aria-expanded`/`aria-controls`/
 * `aria-activedescendant` on the input, a real `role="listbox"` below.
 */
export function TechStackQuickAdd({ existingNames, onAdd }: TechStackQuickAddProps) {
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState<BrandIconSearchResult[]>([]);
    const [activeIndex, setActiveIndex] = React.useState(-1);
    const [isOpen, setIsOpen] = React.useState(false);
    const [notice, setNotice] = React.useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const listboxId = "tech-quick-add-listbox";

    React.useEffect(() => {
        const trimmed = query.trim();
        if (!trimmed) {
            setResults([]);
            return;
        }
        let cancelled = false;
        const timeout = setTimeout(() => {
            adminApi
                .searchTechIcons(trimmed)
                .then((found) => {
                    if (!cancelled) {
                        setResults(found.slice(0, MAX_SUGGESTIONS));
                    }
                })
                .catch(() => {
                    if (!cancelled) {
                        setResults([]);
                    }
                });
        }, SEARCH_DEBOUNCE_MS);
        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [query]);

    function reset() {
        setQuery("");
        setResults([]);
        setActiveIndex(-1);
        setIsOpen(false);
        inputRef.current?.focus();
    }

    function add(entries: { name: string; icon: TechIcon }[]) {
        const { fresh, duplicates } = splitNewNames(entries, existingNames);
        if (fresh.length > 0) {
            onAdd(fresh);
        }
        setNotice(describeAddResult(fresh.length, duplicates));
        reset();
    }

    function addTyped() {
        add(parseTechNames(query).map((name) => ({ name, icon: { type: "auto" } as const })));
    }

    function addFromCatalog(result: BrandIconSearchResult) {
        add([{ name: result.title, icon: { type: "brand", value: result.slug } }]);
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
                setIsOpen(true);
                setActiveIndex((previous) => (previous - 1 >= 0 ? previous - 1 : results.length - 1));
                return;
            case "Enter":
                event.preventDefault();
                if (isOpen && activeIndex >= 0 && results[activeIndex]) {
                    addFromCatalog(results[activeIndex]);
                } else {
                    addTyped();
                }
                return;
            case "Escape":
                setIsOpen(false);
                setActiveIndex(-1);
                return;
        }
    }

    function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
        const text = event.clipboardData.getData("text");
        // A single pasted word is just text going into the field — only a
        // list (something with a separator in it) is treated as a bulk add,
        // so pasting one name still lets the admin edit it before Enter.
        if (!/[,;\n\r\t]/.test(text)) {
            return;
        }
        event.preventDefault();
        add(parseTechNames(text).map((name) => ({ name, icon: { type: "auto" } as const })));
    }

    return (
        <Field
            label="Add technology"
            htmlFor="tech-quick-add"
            hint={HINT}
        >
            <div className="relative">
                <div className="flex items-center gap-sm">
                    <div className="relative flex-1">
                        <Search aria-hidden className="pointer-events-none absolute left-sm top-1/2 -translate-y-1/2 h-md aspect-square w-auto text-text-faint" />
                        <input
                            ref={inputRef}
                            id="tech-quick-add"
                            role="combobox"
                            aria-expanded={isOpen && results.length > 0}
                            aria-controls={listboxId}
                            aria-autocomplete="list"
                            aria-activedescendant={isOpen && activeIndex >= 0 ? `${ listboxId }-option-${ activeIndex }` : undefined}
                            autoComplete="off"
                            placeholder="e.g. Kotlin, Docker, PostgreSQL"
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setNotice(null);
                                setIsOpen(true);
                                setActiveIndex(-1);
                            }}
                            onFocus={() => setIsOpen(true)}
                            // Closes the popup only — never commits half-typed
                            // text, same reasoning as `TokenCombobox`'s own blur
                            // handler.
                            onBlur={() => {
                                setIsOpen(false);
                                setActiveIndex(-1);
                            }}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            className={cn(inputBaseStyles, "pl-xl")}
                        />
                    </div>
                    <Button type="button" variant="secondary" size="md" onClick={addTyped} disabled={!query.trim()} iconLeft={<Plus className="h-md aspect-square w-auto" />}>
                        Add
                    </Button>
                </div>

                {isOpen && results.length > 0 && (
                    <ul
                        id={listboxId}
                        role="listbox"
                        aria-label="Matching logos"
                        className="absolute left-0 right-0 top-full z-20 mt-xs flex flex-col gap-[2px] rounded-md border border-border-subtle bg-surface-raised p-xs shadow-lg"
                    >
                        {results.map((result, index) => (
                            <li
                                key={result.slug}
                                id={`${ listboxId }-option-${ index }`}
                                role="option"
                                aria-selected={index === activeIndex}
                                // Beats the input's blur to the click — the
                                // standard combobox "pick an option without
                                // losing focus" fix.
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    addFromCatalog(result);
                                }}
                                className={cn(
                                    "flex cursor-pointer items-center gap-sm rounded-sm px-sm py-xs text-caption",
                                    index === activeIndex ? "bg-accent-tint-bg text-accent-text" : "text-text-primary hover:bg-surface-base",
                                )}
                            >
                                <span className="h-md aspect-square w-auto shrink-0">
                                    <TechIconRenderer icon={{ kind: "path", d: result.path, title: result.title }} />
                                </span>
                                <span className="flex-1">{result.title}</span>
                                <span className="font-mono text-micro text-text-faint">{result.slug}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {notice && (
                <Text variant="micro" tone="faint" className="normal-case tracking-normal" role="status">
                    {notice}
                </Text>
            )}
        </Field>
    );
}
