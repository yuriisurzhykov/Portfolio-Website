"use client";

import * as React from "react";
import type { TechStackContent } from "@portfolio/backend";
import { Field, Input } from "@/shared/ui/form";
import { BilingualField } from "../fields/BilingualField";
import { ListEditor } from "../fields/ListEditor";
import { SettingsFormFooter } from "../fields/SettingsFormFooter";
import { useSiteContentForm } from "../useSiteContentForm";

export function TechStackSettingsForm({ initialData }: { initialData: TechStackContent }) {
    const [items, setItems] = React.useState<TechStackContent>(initialData);
    const { submitting, error, savedAt, submit } = useSiteContentForm("techStack");

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        void submit(
            items.map((item) => ({
                name: item.name.trim(),
                note: { en: item.note.en.trim(), ru: item.note.ru.trim() },
            })),
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg pb-4xl">
            <ListEditor
                label="Stack row"
                hint="Order = display order. Name is a proper noun and isn't localized."
                items={items}
                onChange={setItems}
                createItem={() => ({ name: "", note: { en: "", ru: "" } })}
                addLabel="Add technology"
                renderItem={(item, index, update) => (
                    <div className="flex flex-col gap-sm">
                        <Field label="Name" htmlFor={`tech-name-${index}`}>
                            <Input id={`tech-name-${index}`} value={item.name} onChange={(e) => update({ name: e.target.value })} />
                        </Field>
                        <BilingualField
                            label="Note"
                            hint="Shown as a tooltip on hover."
                            idPrefix={`tech-note-${index}`}
                            en={item.note.en}
                            ru={item.note.ru}
                            onEnChange={(value) => update({ note: { ...item.note, en: value } })}
                            onRuChange={(value) => update({ note: { ...item.note, ru: value } })}
                        />
                    </div>
                )}
            />

            <SettingsFormFooter submitting={submitting} error={error} savedAt={savedAt} />
        </form>
    );
}
