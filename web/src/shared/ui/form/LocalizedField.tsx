import * as React from "react";
import { Input } from "./Input";
import { Textarea } from "./Textarea";

/** Mirrors `@portfolio/backend`'s `LocalizedText` — not imported from there directly so this stays a pure UI component with no dependency on the backend package's runtime (just its shape). */
export interface LocalizedTextValue {
    en: string;
    ru: string;
}

interface LocalizedFieldBaseProps {
    label: string;
    value: LocalizedTextValue;
    onChange: (value: LocalizedTextValue) => void;
    required?: boolean;
}

/**
 * EN/RU side by side, per the migration plan's Phase 4 wording literally
 * ("per-field EN/RU text inputs side by side") — every `{en, ru}` field in
 * both the Post and Work editors, and every text-bearing block type in the
 * block editor, goes through one of these two instead of two independent
 * labeled inputs repeated at each call site.
 */
export function LocalizedInputField({ label, value, onChange, required }: LocalizedFieldBaseProps) {
    return (
        <div className="flex flex-col gap-xs">
            <span className="text-caption font-medium text-text-secondary">{label}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
                <LocalizedInput lang="en" value={value.en} onChange={(en) => onChange({ ...value, en })} required={required} />
                <LocalizedInput lang="ru" value={value.ru} onChange={(ru) => onChange({ ...value, ru })} required={required} />
            </div>
        </div>
    );
}

export function LocalizedTextareaField({
    label,
    value,
    onChange,
    required,
    rows = 4,
}: LocalizedFieldBaseProps & { rows?: number }) {
    return (
        <div className="flex flex-col gap-xs">
            <span className="text-caption font-medium text-text-secondary">{label}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
                <LocalizedTextarea lang="en" value={value.en} onChange={(en) => onChange({ ...value, en })} required={required} rows={rows} />
                <LocalizedTextarea lang="ru" value={value.ru} onChange={(ru) => onChange({ ...value, ru })} required={required} rows={rows} />
            </div>
        </div>
    );
}

function LocalizedInput({ lang, value, onChange, required }: { lang: "en" | "ru"; value: string; onChange: (v: string) => void; required?: boolean }) {
    return (
        <div className="relative">
            <LangBadge lang={lang} />
            <Input value={value} onChange={(e) => onChange(e.target.value)} required={required} className="pl-[38px]" />
        </div>
    );
}

function LocalizedTextarea({
    lang,
    value,
    onChange,
    required,
    rows,
}: { lang: "en" | "ru"; value: string; onChange: (v: string) => void; required?: boolean; rows?: number }) {
    return (
        <div className="relative">
            <LangBadge lang={lang} />
            <Textarea value={value} onChange={(e) => onChange(e.target.value)} required={required} rows={rows} resizable className="pl-[38px]" />
        </div>
    );
}

function LangBadge({ lang }: { lang: "en" | "ru" }) {
    return (
        <span className="absolute left-sm top-[13px] text-micro font-semibold uppercase tracking-wider text-text-faint pointer-events-none">
            {lang}
        </span>
    );
}
