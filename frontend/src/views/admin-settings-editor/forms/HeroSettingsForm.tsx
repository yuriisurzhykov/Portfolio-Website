"use client";

import * as React from "react";
import type { HeroContent } from "@portfolio/backend";
import { Card } from "@/shared/ui/card";
import { Field, Input } from "@/shared/ui/form";
import { BilingualField } from "../fields/BilingualField";
import { SettingsFormFooter } from "../fields/SettingsFormFooter";
import { useSiteContentForm } from "../useSiteContentForm";

interface HeroFormState {
    headline: string;
    subheadEn: string;
    subheadRu: string;
    chipsEn: string;
    chipsRu: string;
}

/** Comma-joined for editing, split back on submit — same convention as `WorkEditorPage`'s `stack` field (`frontend/src/views/admin-work-editor/WorkEditorPage.tsx`), reused here instead of invented fresh for `headline`/`chips`. */
function joinList(items: string[]): string {
    return items.join(", ");
}

function splitList(value: string): string[] {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function toFormState(hero: HeroContent): HeroFormState {
    return {
        headline: joinList(hero.headline),
        subheadEn: hero.subhead.en,
        subheadRu: hero.subhead.ru,
        chipsEn: joinList(hero.chips.en),
        chipsRu: joinList(hero.chips.ru),
    };
}

function toContent(form: HeroFormState): HeroContent {
    return {
        headline: splitList(form.headline),
        subhead: { en: form.subheadEn.trim(), ru: form.subheadRu.trim() },
        chips: { en: splitList(form.chipsEn), ru: splitList(form.chipsRu) },
    };
}

export function HeroSettingsForm({ initialData }: { initialData: HeroContent }) {
    const [form, setForm] = React.useState<HeroFormState>(() => toFormState(initialData));
    const { submitting, error, savedAt, submit } = useSiteContentForm("hero");

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        void submit(toContent(form));
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg pb-4xl">
            <Card variant="filled" className="p-lg flex flex-col gap-md">
                <Field label="Headline" htmlFor="headline" hint="Comma-separated lines, e.g. Yurii, Surzhykov — rendered stacked, not localized.">
                    <Input id="headline" required value={form.headline} onChange={(e) => setForm((prev) => ({ ...prev, headline: e.target.value }))} />
                </Field>

                <BilingualField
                    label="Subhead"
                    idPrefix="subhead"
                    multiline
                    en={form.subheadEn}
                    ru={form.subheadRu}
                    onEnChange={(value) => setForm((prev) => ({ ...prev, subheadEn: value }))}
                    onRuChange={(value) => setForm((prev) => ({ ...prev, subheadRu: value }))}
                />

                <BilingualField
                    label="Chips"
                    hint="Comma-separated, e.g. flowbus · shipped, navigation-engine · shipped."
                    idPrefix="chips"
                    en={form.chipsEn}
                    ru={form.chipsRu}
                    onEnChange={(value) => setForm((prev) => ({ ...prev, chipsEn: value }))}
                    onRuChange={(value) => setForm((prev) => ({ ...prev, chipsRu: value }))}
                />
            </Card>

            <SettingsFormFooter submitting={submitting} error={error} savedAt={savedAt} />
        </form>
    );
}
