import { Button } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/form";
import type { PropertyChange, WorkPropertiesValue } from "../model/types";

export function WorkCaseStudyProperties({
    value,
    onChange,
    status,
    onRemove,
    errors = {},
}: {
    value: WorkPropertiesValue;
    onChange: PropertyChange<WorkPropertiesValue>;
    status: "in-progress" | "shipped";
    onRemove(): void;
    errors?: Partial<Record<keyof WorkPropertiesValue, string>>;
}) {
    if (!value.hasCaseStudy)
        return (
            <div className="flex flex-col gap-md">
                <p className="text-caption text-text-secondary">
                    A portfolio card is enough. Add a case study to create a full project page.
                </p>
                <Button appearance="flat" size="sm" variant="secondary" onClick={() => onChange("hasCaseStudy", true)}>
                    Add case study
                </Button>
            </div>
        );
    return (
        <div className="flex flex-col gap-lg">
            <p className="rounded-md bg-accent-tint-bg p-sm text-caption text-accent-text">
                Case study enabled. Your card remains in the Work list.
            </p>
            <Field label="Your role" htmlFor="case-role" error={errors.role}>
                <Input
                    id="case-role"
                    appearance="inset"
                    value={value.role}
                    onChange={(event) => onChange("role", event.target.value)}
                />
            </Field>
            <Field
                label="Started"
                htmlFor="case-started"
                hint="Display label, e.g. Sep 2026."
                error={errors.startedLabel}
            >
                <Input
                    id="case-started"
                    appearance="inset"
                    value={value.startedLabel}
                    onChange={(event) => onChange("startedLabel", event.target.value)}
                />
            </Field>
            <Field
                label={status === "in-progress" ? "Target" : "Shipped"}
                htmlFor="case-shipped"
                error={errors.shippedLabel}
            >
                <Input
                    id="case-shipped"
                    appearance="inset"
                    value={value.shippedLabel}
                    onChange={(event) => onChange("shippedLabel", event.target.value)}
                />
            </Field>
            <Field label="Hero image URL" htmlFor="case-hero" hint="Large image on the project page.">
                <Input
                    id="case-hero"
                    appearance="inset"
                    value={value.heroImage}
                    onChange={(event) => onChange("heroImage", event.target.value)}
                />
            </Field>
            <Button appearance="flat" size="sm" variant="ghost" onClick={onRemove}>
                Remove case study…
            </Button>
        </div>
    );
}
