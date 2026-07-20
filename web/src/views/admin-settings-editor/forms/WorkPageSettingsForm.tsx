"use client";

import * as React from "react";
import type { WorkPageContent } from "@portfolio/backend";
import { Card } from "@/shared/ui/card";
import { BilingualField } from "../fields/BilingualField";
import { SettingsFormFooter } from "../fields/SettingsFormFooter";
import { useSiteContentForm } from "../useSiteContentForm";

interface WorkPageFormState {
    headingEn: string;
    headingRu: string;
    descriptionEn: string;
    descriptionRu: string;
}

/** One line per array entry — `heading` is a short list of display lines (currently 2), not free-form prose, same reasoning as `HeroSettingsForm`'s comma-joined `headline`, just newline- instead of comma-joined since a heading line can itself contain a comma. */
function joinLines(lines: string[]): string {
    return lines.join("\n");
}

function splitLines(value: string): string[] {
    return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
}

function toFormState(workPage: WorkPageContent): WorkPageFormState {
    return {
        headingEn: joinLines(workPage.heading.en),
        headingRu: joinLines(workPage.heading.ru),
        descriptionEn: workPage.description.en,
        descriptionRu: workPage.description.ru,
    };
}

function toContent(form: WorkPageFormState): WorkPageContent {
    return {
        heading: { en: splitLines(form.headingEn), ru: splitLines(form.headingRu) },
        description: { en: form.descriptionEn.trim(), ru: form.descriptionRu.trim() },
    };
}

export function WorkPageSettingsForm({ initialData }: { initialData: WorkPageContent }) {
    const [form, setForm] = React.useState<WorkPageFormState>(() => toFormState(initialData));
    const { submitting, error, savedAt, submit } = useSiteContentForm("workPage");

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        void submit(toContent(form));
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg pb-4xl">
            <Card variant="filled" className="p-lg flex flex-col gap-md">
                <BilingualField
                    label="Heading"
                    hint="One line per row, e.g. two lines: Systems I've shipped — / and one still in flight."
                    multiline
                    idPrefix="heading"
                    en={form.headingEn}
                    ru={form.headingRu}
                    onEnChange={(value) => setForm((prev) => ({ ...prev, headingEn: value }))}
                    onRuChange={(value) => setForm((prev) => ({ ...prev, headingRu: value }))}
                />
                <BilingualField
                    label="Description"
                    multiline
                    idPrefix="description"
                    en={form.descriptionEn}
                    ru={form.descriptionRu}
                    onEnChange={(value) => setForm((prev) => ({ ...prev, descriptionEn: value }))}
                    onRuChange={(value) => setForm((prev) => ({ ...prev, descriptionRu: value }))}
                />
            </Card>

            <SettingsFormFooter submitting={submitting} error={error} savedAt={savedAt} />
        </form>
    );
}
