"use client";

import * as React from "react";
import { Field, Input, Textarea } from "@/shared/ui/form";
import { Text } from "@/shared/ui/text";

export interface BilingualFieldProps {
    label: string;
    hint?: string;
    /** Renders a `Textarea` instead of an `Input` for both languages — a heading/name stays single-line, a description/subhead gets room to wrap. */
    multiline?: boolean;
    idPrefix: string;
    en: string;
    ru: string;
    onEnChange: (value: string) => void;
    onRuChange: (value: string) => void;
}

/**
 * `Post`/`Work` deliberately dropped a shared "EN+RU side by side" field
 * (`LocalizedField`, see `web/src/shared/ui/form/README.md`) in favor of
 * English-only edit screens plus a separate `/translate` route — right for
 * a `Document`-backed body where a translation can restructure into a
 * completely different block list. A `SiteContent` section has no
 * equivalent "structure" to diverge: `hero.subhead` is always exactly one
 * English string and one Russian string, nothing a translator would ever
 * want to reshape. Splitting these 7 tiny sections into 7 extra
 * `/admin/settings/[key]/translate` screens would be pure overhead for
 * content this small, so this component intentionally brings back a
 * single "both languages, one form" field — scoped to this view only
 * (not reinstated in `shared/ui/form`), since the reasoning is specific to
 * settings sections, not a general-purpose admin editing pattern.
 */
export function BilingualField({ label, hint, multiline, idPrefix, en, ru, onEnChange, onRuChange }: BilingualFieldProps) {
    return (
        <div className="flex flex-col gap-xs">
            <Text variant="caption" tone="secondary" className="font-medium">
                {label}
            </Text>
            {hint && (
                <Text variant="micro" tone="faint" className="normal-case tracking-normal">
                    {hint}
                </Text>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <Field label="English" htmlFor={`${idPrefix}-en`}>
                    {multiline ? (
                        <Textarea id={`${idPrefix}-en`} required value={en} onChange={(e) => onEnChange(e.target.value)} />
                    ) : (
                        <Input id={`${idPrefix}-en`} required value={en} onChange={(e) => onEnChange(e.target.value)} />
                    )}
                </Field>
                <Field label="Russian" htmlFor={`${idPrefix}-ru`} hint="Leave blank if not translated yet.">
                    {multiline ? (
                        <Textarea id={`${idPrefix}-ru`} value={ru} onChange={(e) => onRuChange(e.target.value)} />
                    ) : (
                        <Input id={`${idPrefix}-ru`} value={ru} onChange={(e) => onRuChange(e.target.value)} />
                    )}
                </Field>
            </div>
        </div>
    );
}
