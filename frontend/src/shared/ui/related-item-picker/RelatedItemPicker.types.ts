export interface RelatedItemOption {
    slug: string;
    /** What the admin actually searches/reads — a Post's or Work's English title, never a raw slug. */
    label: string;
}

export interface RelatedItemPickerProps {
    /** Used to derive the input's `id` and the listbox's `id`/`aria-controls` wiring — must be unique on the page. */
    id: string;
    label: string;
    hint?: string;
    /** The currently-linked slug, or `null` for "no link". Always one of `options`' slugs, or `null` — never an unvalidated string. */
    value: string | null;
    onChange: (slug: string | null) => void;
    /** The full, real list to search/select from — fetched server-side by the caller (same "hand the whole small list to the client, filter locally" pattern as `PostEditorPage`'s `CategoryPicker`), never queried over the network per keystroke. */
    options: RelatedItemOption[];
    placeholder?: string;
}
