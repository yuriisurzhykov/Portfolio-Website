"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { AdminWorkTranslation, TranslateWorkInput } from "@portfolio/backend";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { Button } from "@/shared/ui/button";
import { Field, Input, Textarea } from "@/shared/ui/form";
import { BlockEditor, type BlockEditorHandle } from "@/shared/ui/block-editor";
import { AdminApiError, adminApi } from "@/shared/lib/admin-api";

export interface WorkTranslatePageProps {
    translation: AdminWorkTranslation;
}

interface FormState {
    summary: string;
    startedLabel: string;
    shippedLabel: string;
    role: string;
}

function toFormState(translation: AdminWorkTranslation): FormState {
    return {
        summary: translation.summary.ru,
        startedLabel: translation.startedLabel.ru,
        shippedLabel: translation.shippedLabel.ru,
        role: translation.role.ru,
    };
}

/**
 * See `PostTranslatePage`'s top comment — same shape, same reasoning,
 * applied to `Work`. The case-study section (`startedLabel`/`shippedLabel`/
 * `role`/body blocks) only renders when `translation.hasCaseStudy` is
 * true — a work item with no ENGLISH case study has nothing case-study-
 * shaped to translate yet (see `translateWork`'s comment in
 * admin-work.ts); `summary` is always translatable regardless.
 */
export function WorkTranslatePage({ translation }: WorkTranslatePageProps) {
    const router = useRouter();
    const [form, setForm] = React.useState<FormState>(() => toFormState(translation));
    const blockEditorRef = React.useRef<BlockEditorHandle>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);

    function update<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);

        const input: TranslateWorkInput = {
            summary: form.summary.trim(),
            startedLabel: form.startedLabel.trim(),
            shippedLabel: form.shippedLabel.trim(),
            role: form.role.trim(),
            blocks: blockEditorRef.current?.getBlocks() ?? [],
        };

        setSubmitting(true);
        try {
            await adminApi.translateWork(translation.slug, input);
            router.push(`/admin/work/${ translation.slug }/edit`);
            router.refresh();
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Something went wrong. Please try again.");
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg pb-4xl">
            <Text as="h1" variant="h3">Translate: {translation.slug}</Text>

            <Card variant="filled" className="p-lg flex flex-col gap-md">
                <ReferenceField label="Summary" reference={translation.summary.en}>
                    <Textarea required rows={2} value={form.summary} onChange={(e) => update("summary", e.target.value)} />
                </ReferenceField>
            </Card>

            {translation.hasCaseStudy ? (
                <Card variant="filled" className="p-lg flex flex-col gap-md">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                        <ReferenceField label="Started" reference={translation.startedLabel.en}>
                            <Input required value={form.startedLabel} onChange={(e) => update("startedLabel", e.target.value)} />
                        </ReferenceField>
                        <ReferenceField label="Shipped" reference={translation.shippedLabel.en}>
                            <Input required value={form.shippedLabel} onChange={(e) => update("shippedLabel", e.target.value)} />
                        </ReferenceField>
                    </div>
                    <ReferenceField label="Role" reference={translation.role.en}>
                        <Input required value={form.role} onChange={(e) => update("role", e.target.value)} />
                    </ReferenceField>

                    <div className="flex flex-col gap-sm mt-sm">
                        <Text variant="h5" as="h2">Case study body (Russian)</Text>
                        <BlockEditor ref={blockEditorRef} initialBlocks={translation.caseStudyBlocks} />
                    </div>
                </Card>
            ) : (
                <Text variant="caption" tone="faint">This item has no English case study yet — nothing to translate there.</Text>
            )}

            {error && (
                <Text variant="caption" className="text-status-error" role="alert">{error}</Text>
            )}

            <div className="flex gap-sm">
                <Button type="submit" loading={submitting}>Save translation</Button>
                <Button type="button" variant="secondary" onClick={() => router.push(`/admin/work/${ translation.slug }/edit`)}>Cancel</Button>
            </div>
        </form>
    );
}

function ReferenceField({ label, reference, children }: { label: string; reference: string; children: React.ReactNode }) {
    return (
        <Field label={label} hint={`English: "${ reference }"`}>
            {children}
        </Field>
    );
}
