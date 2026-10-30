import { SingleValueCombobox } from "@/shared/ui/single-value-combobox";

export function CategoryField({
    value,
    onChange,
    categories,
    disabled,
    error,
}: {
    value: string;
    onChange(value: string): void;
    categories: string[];
    disabled?: boolean;
    error?: string;
}) {
    return (
        <SingleValueCombobox
            id="journal-category"
            label="Category"
            value={value || null}
            onChange={(item) => onChange(item ?? "")}
            options={categories.map((item) => ({ value: item, label: item }))}
            creatable
            disabled={disabled}
            error={error}
            placeholder="Choose or create a category"
        />
    );
}
