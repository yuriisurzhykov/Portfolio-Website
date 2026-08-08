import type { TechIcon, TechStackContent } from "@portfolio/backend";

export type TechStackItem = TechStackContent[number];

/**
 * A tech-stack row plus a client-only identity.
 *
 * `SiteContent` stores the whole `techStack` array as one JSON value, so
 * a row has no id in storage — which is why `fields/ListEditor.tsx` keys
 * its rows by array index and documents the resulting focus loss on
 * reorder as an acceptable trade. That trade stops being acceptable here:
 * this editor's whole point is a list long enough to reorder often, by
 * drag AND by keyboard, and an index key makes React reuse the DOM node
 * at a POSITION rather than move the node for a ROW — so keyboard focus
 * stays on the slot the row just left, and every "move up" needs the
 * admin to re-find the row. A monotonic counter costs nothing and fixes
 * both.
 *
 * The id never reaches the DOM (React `key` only, never an `id`/`htmlFor`
 * attribute) — that's deliberate, so a server render and the client's
 * first render can't disagree on an attribute value even though each
 * starts this counter from zero independently.
 */
export interface IdentifiedTech {
    id: string;
    value: TechStackItem;
}

let sequence = 0;

function nextId(): string {
    sequence += 1;
    return `tech-${ sequence }`;
}

export function withIds(items: readonly TechStackItem[]): IdentifiedTech[] {
    return items.map((value) => ({ id: nextId(), value }));
}

/** A brand new row: empty note (both languages), and whatever icon the caller already decided on — the quick-add bar knows whether the admin typed a bare name (`auto`) or picked a specific logo (`brand`). */
export function createTechRow(name: string, icon: TechIcon): IdentifiedTech {
    return { id: nextId(), value: { name, note: { en: "", ru: "" }, icon } };
}

/** Spelled out per variant rather than `{ ...icon, value: icon.value.trim() }` — the spread widens the discriminant to `"brand" | "url" | "svg"`, which no longer matches the discriminated union the schema expects. */
function trimIconValue(icon: TechIcon): TechIcon {
    switch (icon.type) {
        case "brand":
            return { type: "brand", value: icon.value.trim() };
        case "url":
            return { type: "url", value: icon.value.trim() };
        case "svg":
            return { type: "svg", value: icon.value.trim() };
        default:
            return icon;
    }
}

/**
 * Back to the storage shape at submit time — trimmed, and with unnamed
 * rows dropped. A row with a blank name is a half-finished edit, not
 * content: it can't resolve a logo, can't be linked to from `/work`, and
 * would render as an invisible gap. The editor says out loud that these
 * won't be saved (see `TechStackEditor`'s summary line) rather than
 * discarding them silently.
 */
export function toTechStackContent(rows: readonly IdentifiedTech[]): TechStackContent {
    return rows
        .map(({ value }) => ({
            name: value.name.trim(),
            note: { en: value.note.en.trim(), ru: value.note.ru.trim() },
            icon: trimIconValue(value.icon),
        }))
        .filter((item) => item.name.length > 0);
}
