"use client";

import * as React from "react";
import { Card } from "@/shared/ui/card";
import { BilingualField } from "../fields/BilingualField";
import { SettingsFormFooter } from "../fields/SettingsFormFooter";
import { useSiteContentForm } from "../useSiteContentForm";

interface HeadingDescriptionContent {
    heading: { en: string; ru: string };
    description: { en: string; ru: string };
}

export interface HeadingDescriptionSettingsFormProps {
    /** `contact` and `journalPage` are the only two sections with this exact shape — the type parameter stays a plain literal union (not a generic `SiteContentKey`) so a third, differently-shaped section can never be passed here by mistake. */
    settingsKey: "contact" | "journalPage";
    initialData: HeadingDescriptionContent;
}

/**
 * `contact` and `journalPage` are shape-identical
 * (`{ heading: Localized<string>; description: Localized<string> }`) — one
 * component parametrized by which key it reads/writes, instead of two
 * near-duplicate files that would only ever change in lockstep.
 */
export function HeadingDescriptionSettingsForm({ settingsKey, initialData }: HeadingDescriptionSettingsFormProps) {
    const [form, setForm] = React.useState<HeadingDescriptionContent>(initialData);
    const { submitting, error, savedAt, submit } = useSiteContentForm(settingsKey);

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        void submit({
            heading: { en: form.heading.en.trim(), ru: form.heading.ru.trim() },
            description: { en: form.description.en.trim(), ru: form.description.ru.trim() },
        });
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg pb-4xl">
            <Card variant="filled" className="p-lg flex flex-col gap-md">
                <BilingualField
                    label="Heading"
                    idPrefix="heading"
                    en={form.heading.en}
                    ru={form.heading.ru}
                    onEnChange={(value) => setForm((prev) => ({ ...prev, heading: { ...prev.heading, en: value } }))}
                    onRuChange={(value) => setForm((prev) => ({ ...prev, heading: { ...prev.heading, ru: value } }))}
                />
                <BilingualField
                    label="Description"
                    multiline
                    idPrefix="description"
                    en={form.description.en}
                    ru={form.description.ru}
                    onEnChange={(value) => setForm((prev) => ({ ...prev, description: { ...prev.description, en: value } }))}
                    onRuChange={(value) => setForm((prev) => ({ ...prev, description: { ...prev.description, ru: value } }))}
                />
            </Card>

            <SettingsFormFooter submitting={submitting} error={error} savedAt={savedAt} />
        </form>
    );
}
