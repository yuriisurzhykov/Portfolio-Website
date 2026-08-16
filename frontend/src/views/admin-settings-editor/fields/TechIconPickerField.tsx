"use client";

import * as React from "react";
import type { TechIcon } from "@portfolio/backend";
import type { BrandIconSearchResult } from "@/shared/lib/tech-icons";
import { Button } from "@/shared/ui/button";
import { Field, Input, Textarea } from "@/shared/ui/form";
import { Text } from "@/shared/ui/text";
import { TechIcon as TechIconRenderer } from "@/shared/ui/tech-icon";
import { adminApi } from "@/shared/lib/admin-api";

type TechIconType = TechIcon["type"];

const TYPE_LABELS: Record<TechIconType, string> = {
    auto: "Auto",
    brand: "Brand",
    url: "Link",
    svg: "Custom SVG",
    none: "None",
};

const TYPE_ORDER: TechIconType[] = ["auto", "brand", "url", "svg", "none"];

export interface TechIconPickerFieldProps {
    label?: string;
    idPrefix: string;
    value: TechIcon;
    onChange: (icon: TechIcon) => void;
}

/**
 * The per-row icon override: which of the five ways to get a logo this
 * technology uses, and — for `"brand"` — which Simple Icons entry.
 *
 * The tech-stack analogue of `shared/ui/icon-picker/IconPickerField.tsx`,
 * with a different type set (`auto`/`brand`/`url`/`svg`/`none`, not
 * `none`/`url`/`icon`) — see `techIconSchema`'s own comment
 * (`backend/src/content/site-content.ts`) for why these are genuinely
 * different pickers, not one generalized over both.
 *
 * Deliberately has no preview of its own any more. It used to carry two
 * (one resolving `"auto"` from the row's name, one re-resolving an
 * already-saved `"brand"` slug), each with its own request and its own
 * `techName` prop threaded down from the form — all of which existed
 * because the row itself showed nothing. `TechStackRow` now renders the
 * live, resolved logo one line above this control, from a single batched
 * request for the whole list (`useResolvedTechIcons`), so a second
 * preview here would be the same picture twice and two more round-trips
 * to keep it in sync.
 *
 * The one preview that stays is the thumbnail on each SEARCH RESULT —
 * that's a picture of something you haven't chosen yet, which the row
 * can't show by definition, and it costs no extra request (the search
 * endpoint already returns each result's `path`).
 */
export function TechIconPickerField({ label = "Icon", idPrefix, value, onChange }: TechIconPickerFieldProps) {
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState<BrandIconSearchResult[]>([]);

    React.useEffect(() => {
        if (value.type !== "brand") {
            return;
        }
        let cancelled = false;
        const timeout = setTimeout(() => {
            adminApi
                .searchTechIcons(query)
                .then((found) => !cancelled && setResults(found))
                .catch(() => !cancelled && setResults([]));
        }, 200);
        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [query, value.type]);

    function setType(type: TechIconType) {
        if (type === value.type) {
            return;
        }
        if (type === "auto" || type === "none") {
            onChange({ type });
        } else if (type === "url") {
            onChange({ type: "url", value: "" });
        } else if (type === "svg") {
            onChange({ type: "svg", value: "" });
        } else {
            onChange({ type: "brand", value: "" });
        }
        setQuery("");
        setResults([]);
    }

    return (
        <div className="flex flex-col gap-sm">
            <Text variant="caption" tone="secondary" className="font-medium">
                {label}
            </Text>

            <div className="flex items-center gap-xs" role="group" aria-label={`${ label } type`}>
                {TYPE_ORDER.map((type) => (
                    <Button
                        key={type}
                        type="button"
                        variant={value.type === type ? "secondary" : "ghost"}
                        size="sm"
                        aria-pressed={value.type === type}
                        onClick={() => setType(type)}
                    >
                        {TYPE_LABELS[type]}
                    </Button>
                ))}
            </div>

            {value.type === "auto" && (
                <Text variant="micro" tone="faint" className="normal-case tracking-normal">
                    Guessed from the name above. If the row shows &quot;No logo&quot;, switch to &quot;Brand&quot; and search for it.
                </Text>
            )}

            {value.type === "url" && (
                <Field label="Icon URL" htmlFor={`${ idPrefix }-url`} hint="Direct link to an image or SVG icon.">
                    <Input
                        id={`${ idPrefix }-url`}
                        placeholder="https://example.com/icon.svg"
                        value={value.value}
                        onChange={(event) => onChange({ type: "url", value: event.target.value })}
                    />
                </Field>
            )}

            {value.type === "svg" && (
                <Field
                    label="SVG markup"
                    htmlFor={`${ idPrefix }-svg`}
                    hint="Paste a full <svg>...</svg> element — for a technology with no real logo in Simple Icons and no hosted image to link to. Sanitized before it's ever shown (scripts/event handlers are stripped); doesn't need to use currentColor, but it will only pick up the accent hover color if it does."
                >
                    <Textarea
                        id={`${ idPrefix }-svg`}
                        rows={4}
                        placeholder='<svg viewBox="0 0 24 24" fill="currentColor">...</svg>'
                        value={value.value}
                        onChange={(event) => onChange({ type: "svg", value: event.target.value })}
                        className="font-mono text-caption"
                    />
                </Field>
            )}

            {value.type === "brand" && (
                <div className="flex flex-col gap-xs">
                    <Field
                        label="Search Simple Icons"
                        htmlFor={`${ idPrefix }-brand-search`}
                        hint={value.value ? `Currently using "${ value.value }". Search to change it.` : 'Search by brand name, e.g. "docker" — pick a result below.'}
                    >
                        <Input
                            id={`${ idPrefix }-brand-search`}
                            placeholder="Search…"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                    </Field>
                    {results.length > 0 && (
                        <ul className="flex max-h-55 flex-col gap-0.5 overflow-y-auto rounded-md border border-border-subtle bg-surface-raised p-xs">
                            {results.map((result) => (
                                <li key={result.slug}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onChange({ type: "brand", value: result.slug });
                                            setQuery("");
                                            setResults([]);
                                        }}
                                        className="flex w-full items-center gap-sm rounded-sm px-sm py-xs text-left font-mono text-caption text-text-primary hover:bg-surface-base"
                                    >
                                        <span className="w-5 h-5 shrink-0 text-text-primary">
                                            <TechIconRenderer icon={{ kind: "path", d: result.path, title: result.title }} />
                                        </span>
                                        {result.title}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
