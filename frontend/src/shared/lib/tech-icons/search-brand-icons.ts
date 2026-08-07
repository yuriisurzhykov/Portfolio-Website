import { getAllSimpleIcons } from "./registry";

export interface BrandIconSearchResult {
    slug: string;
    title: string;
    /** Included directly in search results (not fetched in a second round-trip) — the result set is already small (`limit`, default 20), so there's no real bandwidth cost, and the admin picker needs it immediately to render a live preview of the highlighted result before it's even selected. */
    path: string;
}

/** Only the two fields `matches`/`rank` actually read — not the full `SimpleIcon` (which also carries `svg`/`path`/`source`/`hex`). Narrowing the parameter type is what lets their own tests pass small, hand-built fake objects instead of having to find a real Simple Icons entry with exactly the right slug/title combination to exercise a given branch, which real catalog data doesn't always happen to provide (see `search-brand-icons.test.ts`'s comment on `rank`). */
export interface SearchableIcon {
    slug: string;
    title: string;
}

/**
 * A small, dependency-free substring/prefix match — good enough for "does
 * the admin's typed query look like this icon's title or slug", not a
 * general-purpose fuzzy ranking. Deliberately NOT the same matcher as
 * `shared/ui/token-combobox`'s subsequence-based one: that one solves a
 * different problem (does a free-typed tech NAME like "jc" plausibly
 * abbreviate an existing `techStack` entry like "Jetpack Compose"), while
 * this one searches a real, already-known catalog of ~3450 brand titles
 * where an admin types a recognizable prefix ("dock" → "Docker") — a much
 * easier case that doesn't need subsequence scoring, so it doesn't share
 * that matcher's complexity.
 *
 * Exported (not module-private) purely for direct, precise unit testing
 * with hand-built fake icons — never called from outside this module in
 * real code.
 */
export function matches(icon: SearchableIcon, query: string): boolean {
    return icon.slug.includes(query) || icon.title.toLowerCase().includes(query);
}

/** Lower rank sorts first — an exact slug match beats a startsWith match, which beats a plain substring match. Exported for the same testing reason as `matches` above. */
export function rank(icon: SearchableIcon, query: string): number {
    if (icon.slug === query) {
        return 0;
    }
    if (icon.slug.startsWith(query) || icon.title.toLowerCase().startsWith(query)) {
        return 1;
    }
    return 2;
}

/**
 * Powers the admin tech-icon picker's live search (`GET
 * /api/admin/tech-icons?q=...`) — never called from the client directly,
 * since that would require shipping the whole `simple-icons` catalog to
 * the browser (see `registry.ts`'s top comment). An empty/whitespace-only
 * query returns no results rather than the first `limit` icons
 * alphabetically — an admin who hasn't typed anything yet has nothing
 * meaningful to rank against.
 */
export function searchBrandIcons(query: string, limit = 20): BrandIconSearchResult[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
        return [];
    }
    return getAllSimpleIcons()
        .filter((icon) => matches(icon, normalized))
        .sort((a, b) => rank(a, normalized) - rank(b, normalized) || a.title.localeCompare(b.title))
        .slice(0, limit)
        .map((icon) => ({ slug: icon.slug, title: icon.title, path: icon.path }));
}
