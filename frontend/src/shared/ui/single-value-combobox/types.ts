export interface ComboboxOption {
    value: string;
    label: string;
}

export interface SingleValueComboboxProps {
    id: string;
    label: string;
    hint?: string;
    error?: string;
    value: string | null;
    onChange(value: string | null): void;
    options: readonly ComboboxOption[];
    /** Closed by default: relationship controls must never accept unlisted values. */
    creatable?: boolean;
    placeholder?: string;
    disabled?: boolean;
}
