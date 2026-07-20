"use client";

import * as React from "react";
import type { PrinciplesContent } from "@portfolio/backend";
import { BilingualField } from "../fields/BilingualField";
import { ListEditor } from "../fields/ListEditor";
import { SettingsFormFooter } from "../fields/SettingsFormFooter";
import { useSiteContentForm } from "../useSiteContentForm";

export function PrinciplesSettingsForm({ initialData }: { initialData: PrinciplesContent }) {
    const [items, setItems] = React.useState<PrinciplesContent>(initialData);
    const { submitting, error, savedAt, submit } = useSiteContentForm("principles");

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        void submit(
            items.map((item) => ({
                title: { en: item.title.en.trim(), ru: item.title.ru.trim() },
                description: { en: item.description.en.trim(), ru: item.description.ru.trim() },
            })),
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg pb-4xl">
            <ListEditor
                label='"How I work" cards'
                hint="Order = display order on the landing page."
                items={items}
                onChange={setItems}
                createItem={() => ({ title: { en: "", ru: "" }, description: { en: "", ru: "" } })}
                addLabel="Add principle"
                renderItem={(item, index, update) => (
                    <div className="flex flex-col gap-sm">
                        <BilingualField
                            label="Title"
                            idPrefix={`principle-title-${index}`}
                            en={item.title.en}
                            ru={item.title.ru}
                            onEnChange={(value) => update({ title: { ...item.title, en: value } })}
                            onRuChange={(value) => update({ title: { ...item.title, ru: value } })}
                        />
                        <BilingualField
                            label="Description"
                            multiline
                            idPrefix={`principle-description-${index}`}
                            en={item.description.en}
                            ru={item.description.ru}
                            onEnChange={(value) => update({ description: { ...item.description, en: value } })}
                            onRuChange={(value) => update({ description: { ...item.description, ru: value } })}
                        />
                    </div>
                )}
            />

            <SettingsFormFooter submitting={submitting} error={error} savedAt={savedAt} />
        </form>
    );
}
