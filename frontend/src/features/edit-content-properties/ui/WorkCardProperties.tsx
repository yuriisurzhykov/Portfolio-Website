import { Field, Input, Textarea } from "@/shared/ui/form";
import { RelatedItemPicker, type RelatedItemOption } from "@/shared/ui/related-item-picker";
import { TokenCombobox } from "@/shared/ui/token-combobox";
import type { PropertyChange, WorkPropertiesValue } from "../model/types";

export function WorkCardProperties({
    value,
    onChange,
    techStackSuggestions,
    postOptions,
    errors = {},
}: {
    value: WorkPropertiesValue;
    onChange: PropertyChange<WorkPropertiesValue>;
    techStackSuggestions: string[];
    postOptions: RelatedItemOption[];
    errors?: Partial<Record<keyof WorkPropertiesValue, string>>;
}) {
    return (
        <div className="flex flex-col gap-lg">
            <Field label="Project title" htmlFor="work-title" error={errors.title}>
                <Textarea
                    id="work-title"
                    rows={2}
                    appearance="inset"
                    value={value.title}
                    onChange={(event) => onChange("title", event.target.value)}
                />
            </Field>
            <Field label="Summary" htmlFor="work-summary" error={errors.summary}>
                <Textarea
                    id="work-summary"
                    rows={4}
                    appearance="inset"
                    value={value.summary}
                    onChange={(event) => onChange("summary", event.target.value)}
                />
            </Field>
            <TokenCombobox
                id="work-stack"
                label="Technology stack"
                values={value.stack}
                onChange={(items) => onChange("stack", items)}
                suggestions={techStackSuggestions}
                placeholder="Add a technology"
            />
            <Field
                label="Portfolio date"
                htmlFor="work-date"
                error={errors.date}
                hint="Controls order in the Work list."
            >
                <Input
                    id="work-date"
                    type="date"
                    appearance="inset"
                    value={value.date}
                    onChange={(event) => onChange("date", event.target.value)}
                />
            </Field>
            <details className="flex flex-col gap-md">
                <summary className="cursor-pointer text-caption text-text-secondary">Images and linked content</summary>
                <div className="mt-md flex flex-col gap-md">
                    <Field label="Cover image URL" htmlFor="work-cover" hint="Used on the home page.">
                        <Input
                            id="work-cover"
                            appearance="inset"
                            value={value.coverImage}
                            onChange={(event) => onChange("coverImage", event.target.value)}
                        />
                    </Field>
                    <RelatedItemPicker
                        id="work-related-post"
                        label="Related journal post"
                        value={value.relatedPostSlug || null}
                        onChange={(slug) => onChange("relatedPostSlug", slug ?? "")}
                        options={postOptions}
                        placeholder="Choose a journal post"
                    />
                </div>
            </details>
        </div>
    );
}
