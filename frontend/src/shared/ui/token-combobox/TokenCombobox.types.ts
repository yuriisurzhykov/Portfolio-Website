export interface TokenComboboxProps {
    /** Used to derive the input's `id` and the listbox's `id`/`aria-controls` wiring — must be unique on the page. */
    id: string;
    label: string;
    hint?: string;
    /** Free-text tokens already entered — never required to be a subset of `suggestions` (see this component's README for why). */
    values: string[];
    onChange: (values: string[]) => void;
    /** The known list to fuzzy-match against while typing, and to check committed tokens against for a "did you mean" hint. */
    suggestions: string[];
    placeholder?: string;
}
