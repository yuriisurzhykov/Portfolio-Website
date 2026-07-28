"use client";

import * as React from "react";
import type { ConfigContent } from "@portfolio/backend";
import { Card } from "@/shared/ui/card";
import { Field, Input, Select } from "@/shared/ui/form";
import { BilingualField } from "../fields/BilingualField";
import { SettingsFormFooter } from "../fields/SettingsFormFooter";
import { useSiteContentForm } from "../useSiteContentForm";

/** `role` is the only localized field on `config` — everything else (name, initials, email, availability, social links) is identity/contact metadata, the same in every language, same reasoning as `WorkEditorPage`'s "Title" field. */
export function ConfigSettingsForm({ initialData }: { initialData: ConfigContent }) {
    const [form, setForm] = React.useState<ConfigContent>(initialData);
    const { submitting, error, savedAt, submit } = useSiteContentForm("config");

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        void submit({
            name: form.name.trim(),
            initials: form.initials.trim(),
            role: { en: form.role.en.trim(), ru: form.role.ru.trim() },
            email: form.email.trim(),
            availability: form.availability,
            social: { github: form.social.github.trim(), linkedin: form.social.linkedin.trim() },
        });
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg pb-4xl">
            <Card variant="filled" className="p-lg flex flex-col gap-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                    <Field label="Name" htmlFor="name">
                        <Input id="name" required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                    </Field>
                    <Field label="Initials" htmlFor="initials" hint="Shown in the nav brand mark.">
                        <Input id="initials" required value={form.initials} onChange={(e) => setForm((prev) => ({ ...prev, initials: e.target.value }))} />
                    </Field>
                    <Field label="Email" htmlFor="email">
                        <Input id="email" type="email" required value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
                    </Field>
                    <Field label="Availability" htmlFor="availability" hint="Drives the nav availability pill.">
                        <Select
                            id="availability"
                            value={form.availability}
                            onChange={(e) => setForm((prev) => ({ ...prev, availability: e.target.value as ConfigContent["availability"] }))}
                        >
                            <option value="available">Available</option>
                            <option value="engaged">Engaged</option>
                            <option value="limited">Limited</option>
                        </Select>
                    </Field>
                    <Field label="GitHub URL" htmlFor="github">
                        <Input
                            id="github"
                            value={form.social.github}
                            onChange={(e) => setForm((prev) => ({ ...prev, social: { ...prev.social, github: e.target.value } }))}
                        />
                    </Field>
                    <Field label="LinkedIn URL" htmlFor="linkedin">
                        <Input
                            id="linkedin"
                            value={form.social.linkedin}
                            onChange={(e) => setForm((prev) => ({ ...prev, social: { ...prev.social, linkedin: e.target.value } }))}
                        />
                    </Field>
                </div>

                <BilingualField
                    label="Role"
                    idPrefix="role"
                    en={form.role.en}
                    ru={form.role.ru}
                    onEnChange={(value) => setForm((prev) => ({ ...prev, role: { ...prev.role, en: value } }))}
                    onRuChange={(value) => setForm((prev) => ({ ...prev, role: { ...prev.role, ru: value } }))}
                />
            </Card>

            <SettingsFormFooter submitting={submitting} error={error} savedAt={savedAt} />
        </form>
    );
}
