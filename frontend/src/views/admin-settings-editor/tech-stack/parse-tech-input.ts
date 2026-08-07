/**
 * The separators a real pasted stack list uses — a comma-separated line
 * ("Kotlin, Docker, PostgreSQL"), one-per-line from a README, or a
 * semicolon/tab-separated cell from a spreadsheet. Deliberately does NOT
 * include `&`, `/` or `+`: "Coroutines & Flow", "CI/CD" and "C++" are
 * single technologies, and splitting them would silently mangle exactly
 * the names an admin can't easily re-type.
 */
const NAME_SEPARATORS = /[,;\n\r\t]+/;

/**
 * The comparison key for "is this the same technology as one already in
 * the list" — case-insensitive, whitespace-collapsed, nothing more.
 *
 * Deliberately NOT `shared/lib/slugify`, the only slug function reachable
 * from a Client Component: it strips punctuation entirely, so "C++" and
 * "C#" both collapse to `"c"`, and refusing to add the second one as a
 * "duplicate" would be plainly wrong. A false positive here silently
 * blocks a legitimate entry; a false negative just leaves two similar
 * rows next to each other in a list the admin is already looking at — so
 * this errs toward the cheap failure.
 *
 * The public site's own identity, `toTechSlug`
 * (`backend/src/content/tech-slug.ts`), does NOT have that flaw any more
 * — it spells `+`/`#` out as words for exactly this reason. It would be
 * the more accurate key here (it would also catch "jetpack-compose" vs.
 * "Jetpack Compose", which this one lets through), but it's exported from
 * `@portfolio/backend`'s main entry point, which pulls in Prisma and
 * can't cross into a client bundle. Making it importable from here is a
 * real follow-up, not a reason to hand-copy its symbol table into the
 * frontend.
 */
export function techNameKey(name: string): string {
    return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Splits one paste/keystroke's worth of raw text into individual
 * technology names, trimmed, inner whitespace collapsed, empties dropped,
 * and de-duplicated against each other (first spelling wins). Returns
 * `[]` for text that's only separators/whitespace.
 */
export function parseTechNames(raw: string): string[] {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const part of raw.split(NAME_SEPARATORS)) {
        const name = part.trim().replace(/\s+/g, " ");
        if (!name) {
            continue;
        }
        const key = techNameKey(name);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        names.push(name);
    }
    return names;
}

export interface TechNameSplit<T> {
    /** Entries not already present — in input order, with the admin's own spelling preserved. */
    fresh: T[];
    /** Names skipped because the list already has them — reported back so the UI can say so instead of silently dropping them. */
    duplicates: string[];
}

/**
 * Generic over the entry, not `string[]` in / `string[]` out, so the
 * caller can carry each name's chosen icon through the filter without
 * having to re-associate names with icons afterwards — re-pairing by name
 * is exactly where a batch containing the same name twice would go wrong.
 */
export function splitNewNames<T extends { name: string }>(entries: readonly T[], existing: readonly string[]): TechNameSplit<T> {
    const taken = new Set(existing.map(techNameKey));
    const fresh: T[] = [];
    const duplicates: string[] = [];
    for (const entry of entries) {
        const key = techNameKey(entry.name);
        if (taken.has(key)) {
            duplicates.push(entry.name);
            continue;
        }
        taken.add(key);
        fresh.push(entry);
    }
    return { fresh, duplicates };
}

const MAX_LISTED_NAMES = 3;

function formatNameList(names: readonly string[]): string {
    if (names.length <= MAX_LISTED_NAMES) {
        return names.join(", ");
    }
    return `${ names.slice(0, MAX_LISTED_NAMES).join(", ") } and ${ names.length - MAX_LISTED_NAMES } more`;
}

/**
 * The one-line status message under the quick-add field, or `null` for
 * "say nothing".
 *
 * A plain successful add is deliberately silent: the new row appearing in
 * the list right below is already the confirmation, and a "Added Kotlin."
 * toast on every single Enter would be noise in the exact flow this
 * editor exists to make fast. Only a SKIPPED name needs explaining —
 * otherwise the admin sees nothing happen and has no idea why.
 */
export function describeAddResult(added: number, duplicates: readonly string[]): string | null {
    if (duplicates.length === 0) {
        return null;
    }
    const listed = `${ formatNameList(duplicates) } ${ duplicates.length === 1 ? "is" : "are" } already in the list.`;
    return added === 0 ? listed : `Added ${ added }. ${ listed }`;
}
