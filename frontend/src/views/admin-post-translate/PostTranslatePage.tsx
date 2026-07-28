"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { AdminPostTranslation, TranslatePostInput } from "@portfolio/backend";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { Button } from "@/shared/ui/button";
import { Field, Input, Textarea } from "@/shared/ui/form";
import { BlockEditor, type BlockEditorHandle } from "@/shared/ui/block-editor";
import { adminApi, AdminApiError } from "@/shared/lib/admin-api";

export interface PostTranslatePageProps {
    translation: AdminPostTranslation;
}

interface FormState {
    title: string;
    category: string;
    excerpt: string;
}

function toFormState(translation: AdminPostTranslation): FormState {
    return {
        title: translation.title.ru,
        category: translation.category.ru,
        excerpt: translation.excerpt.ru,
    };
}

/**
 * The "Add translation"/"Edit translation" screen — see the migration
 * plan's "перевод — отдельная страница, не параллельный ввод". Only ever
 * writes through `adminApi.translatePost` (`PUT .../translation`), never
 * `updatePost` — there's no English field on this page at all to
 * accidentally overwrite. The English original is shown next to each
 * Russian field as plain read-only reference text, not a second input —
 * a translator needs to see it, never edit it here.
 */
export function PostTranslatePage({translation}: PostTranslatePageProps) {
    const router = useRouter();
    const [form, setForm] = React.useState<FormState>(() => toFormState(translation));
    const blockEditorRef = React.useRef<BlockEditorHandle>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);

    function update<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({...prev, [key]: value}));
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);

        const input: TranslatePostInput = {
            title: form.title.trim(),
            category: form.category.trim(),
            excerpt: form.excerpt.trim(),
            blocks: blockEditorRef.current?.getBlocks() ?? [],
        };

        setSubmitting(true);
        try {
            await adminApi.translatePost(translation.slug, input);
            router.push(`/admin/journal/${ translation.slug }/edit`);
            router.refresh();
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Something went wrong. Please try again.");
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={ handleSubmit } className="flex flex-col gap-lg pb-4xl">
            <Text as="h1" variant="h3">Translate: { translation.slug }</Text>

            <Card variant="filled" className="p-lg flex flex-col gap-md">
                <ReferenceField label="Title" reference={ translation.title.en }>
                    <Input required value={ form.title } onChange={ (e) => update("title", e.target.value) }/>
                </ReferenceField>
                <ReferenceField label="Category" reference={ translation.category.en }>
                    <Input required value={ form.category } onChange={ (e) => update("category", e.target.value) }/>
                </ReferenceField>
                <ReferenceField label="Excerpt" reference={ translation.excerpt.en }>
                    <Textarea required rows={ 2 } value={ form.excerpt }
                              onChange={ (e) => update("excerpt", e.target.value) }/>
                </ReferenceField>
            </Card>

            <div className="flex flex-col gap-sm">
                <Text variant="h5" as="h2">Body (Russian)</Text>
                <BlockEditor ref={ blockEditorRef } initialBlocks={ translation.blocks }/>
            </div>

            { error && (
                <Text variant="caption" className="text-status-error" role="alert">{ error }</Text>
            ) }

            <div className="flex gap-sm">
                <Button type="submit" loading={ submitting }>Save translation</Button>
                <Button type="button" variant="secondary"
                        onClick={ () => router.push(`/admin/journal/${ translation.slug }/edit`) }>Cancel</Button>
            </div>
        </form>
    );
}

/** Label + the English original as a small reference line, then the Russian input/textarea passed as `children` — every field on this page needs both halves, so they're not repeated three times. */
function ReferenceField({label, reference, children}: { label: string; reference: string; children: React.ReactNode }) {
    return (
        <Field label={ label } hint={ `English: "${ reference }"` }>
            { children }
        </Field>
    );
}
