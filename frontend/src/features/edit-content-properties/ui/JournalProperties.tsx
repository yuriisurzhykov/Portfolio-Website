import type { ReactNode } from "react";
import { Field, Textarea } from "@/shared/ui/form";
import { RelatedItemPicker, type RelatedItemOption } from "@/shared/ui/related-item-picker";
import type { JournalPropertiesValue, PropertyChange } from "../model/types";
import { CategoryField } from "./CategoryField";

export interface JournalPropertiesProps {
    value: JournalPropertiesValue;
    onChange: PropertyChange<JournalPropertiesValue>;
    existingCategories: string[];
    workOptions: RelatedItemOption[];
    urlField?: ReactNode;
    disabled?: boolean;
    errors?: Partial<Record<keyof JournalPropertiesValue, string>>;
}
export function JournalProperties({
    value,
    onChange,
    existingCategories,
    workOptions,
    urlField,
    disabled,
    errors = {},
}: JournalPropertiesProps) {
    return (
        <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-lg border-none p-none">
            <div>
                <h2 className="text-h3 font-semibold">Post details</h2>
                <p className="mt-xxs text-caption text-text-muted">Used on your journal list.</p>
            </div>
            <Field label="Title" htmlFor="post-title" error={errors.title}>
                <Textarea
                    id="post-title"
                    appearance="inset"
                    rows={3}
                    value={value.title}
                    onChange={(event) => onChange("title", event.target.value)}
                    placeholder="Untitled post"
                />
            </Field>
            <CategoryField
                value={value.category}
                onChange={(category) => onChange("category", category)}
                categories={existingCategories}
                disabled={disabled}
                error={errors.category}
            />
            <Field
                label="Excerpt"
                htmlFor="post-excerpt"
                hint="Shown on the list, outside the article."
                error={errors.excerpt}
            >
                <Textarea
                    id="post-excerpt"
                    appearance="inset"
                    rows={4}
                    value={value.excerpt}
                    onChange={(event) => onChange("excerpt", event.target.value)}
                />
            </Field>
            <RelatedItemPicker
                id="post-related-work"
                label="Related work"
                value={value.relatedWorkSlug || null}
                onChange={(slug) => onChange("relatedWorkSlug", slug ?? "")}
                options={workOptions}
                placeholder="Choose a project"
            />
            {urlField}
        </fieldset>
    );
}
