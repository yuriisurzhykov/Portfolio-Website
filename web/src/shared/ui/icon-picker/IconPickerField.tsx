"use client";

import * as React from "react";
import type { IconRef } from "@portfolio/backend";
import { Button } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/form";
import { Text } from "@/shared/ui/text";
import { iconNames, isKnownLucideIconName } from "./lucide-icon-names";
import { IconRefPreview } from "./IconRefPreview";

type IconRefType = IconRef["type"];

const TYPE_LABELS: Record<IconRefType, string> = {
    none: "None",
    url: "Link",
    icon: "Icon",
};

const TYPE_ORDER: IconRefType[] = ["none", "url", "icon"];

export interface IconPickerFieldProps {
    label?: string;
    idPrefix: string;
    value: IconRef;
    onChange: (icon: IconRef) => void;
}

/**
 * None / Link / Icon toggle + the matching input for whichever type is
 * selected, plus a live `IconRefPreview` that's always visible — the
 * exact ask that started this: "I want to see a live preview while
 * adding it, and have the icon actually get validated." The preview
 * updates on every keystroke because it's driven by the same controlled
 * `value` the inputs below write to, not a separate "confirm" step.
 *
 * Switching type resets `value` to that type's empty shape (`{ type }` /
 * `{ type, value: "" }`) rather than keeping a stale `value` string
 * around from a previously-selected type — a URL typed into Link mode has
 * no meaning if the admin then switches to Icon mode, and keeping it
 * around invisibly would just resurface confusingly if they switched back.
 */
export function IconPickerField({ label = "Icon", idPrefix, value, onChange }: IconPickerFieldProps) {
    function setType(type: IconRefType) {
        if (type === value.type) {
            return;
        }
        onChange(type === "none" ? { type: "none" } : { type, value: "" });
    }

    const iconValue = value.type === "icon" ? value.value : "";
    const iconIsKnown = iconValue.length > 0 && isKnownLucideIconName(iconValue);
    const iconIsUnknown = iconValue.length > 0 && !iconIsKnown;
    const iconDatalistId = `${idPrefix}-icon-names`;

    return (
        <div className="flex flex-col gap-sm">
            <Text variant="caption" tone="secondary" className="font-medium">
                {label}
            </Text>

            <div className="flex items-center gap-md">
                <IconRefPreview icon={value} className="w-11 h-11" />

                <div className="flex items-center gap-xs" role="group" aria-label={`${label} type`}>
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
            </div>

            {value.type === "url" && (
                <Field label="Icon URL" htmlFor={`${idPrefix}-url`} hint="Direct link to an image or SVG icon.">
                    <Input
                        id={`${idPrefix}-url`}
                        placeholder="https://example.com/icon.svg"
                        value={value.value}
                        onChange={(event) => onChange({ type: "url", value: event.target.value })}
                    />
                </Field>
            )}

            {value.type === "icon" && (
                <Field
                    label="Icon name"
                    htmlFor={`${idPrefix}-icon`}
                    error={
                        iconIsUnknown
                            ? "Unknown icon name — pick a suggestion from the list, or check the spelling on lucide.dev/icons."
                            : undefined
                    }
                    hint={
                        iconIsUnknown
                            ? undefined
                            : iconIsKnown
                              ? "Recognized — see the preview on the left."
                              : 'Lucide icon name, kebab-case (e.g. "shield-check"). Full list: lucide.dev/icons.'
                    }
                >
                    <Input
                        id={`${idPrefix}-icon`}
                        list={iconDatalistId}
                        placeholder="shield-check"
                        value={iconValue}
                        onChange={(event) => onChange({ type: "icon", value: event.target.value })}
                        aria-invalid={iconIsUnknown}
                        autoComplete="off"
                    />
                    {/* Native <datalist>: browser-provided autocomplete over the full, real icon-name list — no search-combobox dependency needed for ~1900 options the browser already knows how to filter as the admin types. */}
                    <datalist id={iconDatalistId}>
                        {iconNames.map((name) => (
                            <option key={name} value={name} />
                        ))}
                    </datalist>
                </Field>
            )}
        </div>
    );
}
