import { slugify } from "./slugify";

/**
 * A tech name's stable, URL-safe identifier — reuses `slugify.ts`'s exact
 * normalization (lowercase, strip accents, non-alphanumeric runs → `-`)
 * instead of duplicating it, because the transformation itself is
 * identical to a post/work title's own slug, just applied to a shorter,
 * always-present string (`techStack[].name`, `Work.stack[]` entries).
 *
 * This is the ONE identifier that ties three independent, free-text
 * sources together without requiring any of them to agree on exact
 * casing/whitespace: the landing page's `techStack` list (admin-edited
 * name), a work item's `stack` array (admin-edited, comma-separated free
 * text — see `admin-work.ts`), and the `?tech=` query param a logo link
 * on the landing page points at. Two entries slug-match if and only if
 * they'd survive being typed slightly differently ("Jetpack Compose" vs.
 * "jetpack-compose" vs. "  Jetpack   Compose ") — not if they're only
 * *conceptually* the same technology ("Python" vs. "Python & Jinja2" still
 * produce different slugs, on purpose: silently treating those as equal
 * would be guessing at admin intent, not normalizing formatting).
 */
export function toTechSlug(name: string): string {
    return slugify(name);
}

/**
 * A handful of tech names whose real Simple Icons (simpleicons.org) slug
 * doesn't match what stripping punctuation/whitespace would mechanically
 * produce — mostly because Simple Icons spells punctuation out as a word
 * ("C++" → "cplusplus", not "c") or keeps a literal "dot" for a dotted
 * product name ("Node.js" → "nodedotjs"). Every value here was verified by
 * hand against the installed `simple-icons` package's real `slug` field
 * (see `frontend/src/shared/lib/tech-icons`), not guessed — a wrong guess
 * here wouldn't just miss a logo (the safe failure mode), it could
 * silently render the WRONG brand's logo if the mechanical guess happens
 * to collide with a different real icon.
 */
const SIMPLE_ICON_SLUG_ALIASES: Readonly<Record<string, string>> = {
    "c++": "cplusplus",
    "c#": "csharp",
    ".net": "dotnet",
    "node.js": "nodedotjs",
    "node": "nodedotjs",
    "next.js": "nextdotjs",
    "nuxt.js": "nuxtdotjs",
    "vue.js": "vuedotjs",
    "three.js": "threedotjs",
    "aws": "amazonaws",
    "postgres": "postgresql",
    "godot": "godotengine",
    "vscode": "visualstudiocode",
    "visual studio code": "visualstudiocode",
};

/**
 * Best-effort guess at a tech name's Simple Icons slug — "best-effort"
 * because, as `SIMPLE_ICON_SLUG_ALIASES` documents above, Simple Icons'
 * slugs aren't a pure function of a brand's display name in every case.
 * This handles the common, mechanically-derivable ones ("PostgreSQL" →
 * "postgresql", "Jetpack Compose" → "jetpackcompose") plus the hand-
 * verified exceptions in the alias table.
 *
 * Deliberately does NOT check whether the result is a real, installed
 * icon — that would require this pure, dependency-free function to import
 * the (large) `simple-icons` package, which belongs behind the frontend's
 * server-only boundary (`frontend/src/shared/lib/tech-icons`), not in
 * `backend/`. A caller MUST treat this as a candidate slug to look up, not
 * a guaranteed hit — `resolveTechIcon` (frontend) is what actually
 * verifies it and falls back to no icon when the guess doesn't resolve.
 */
export function toSimpleIconSlug(name: string): string {
    const normalized = name.trim().toLowerCase();
    const alias = SIMPLE_ICON_SLUG_ALIASES[normalized];
    if (alias) {
        return alias;
    }
    return normalized.replace(/[^a-z0-9]/g, "");
}

/**
 * Filters a list of `{ stack }` items down to the ones whose `stack`
 * contains a tech matching `slug` — generic over the item shape (not
 * `WorkSummary[]` specifically) so this stays a pure, zero-Prisma-import
 * function that `work.ts` calls rather than a method defined ON it; see
 * this repo's mutation-testing rule for why "pure logic gets its own file"
 * matters here specifically — `work.ts` already has DB-touching functions
 * excluded from Stryker's scope (`backend/stryker.config.mjs`), and mixing
 * this comparison logic into that file would exclude it from mutation
 * coverage too, for no reason (it never touches Prisma).
 */
export function filterWorkByTechSlug<T extends { stack: string[] }>(items: T[], slug: string): T[] {
    return items.filter((item) => item.stack.some((tech) => toTechSlug(tech) === slug));
}

/**
 * Finds the original, as-typed spelling of a tech whose slug matches
 * `slug` — used to render a human-readable label for `/work?tech=...`'s
 * active-filter chip, since the URL only carries the slug, not the
 * admin's actual capitalization/spelling (`"Jetpack Compose"`, not
 * `"jetpack-compose"`). Returns the first match, first item first — good
 * enough for a display label; callers needing every distinct spelling
 * would want a different function.
 */
export function findTechDisplayName<T extends { stack: string[] }>(items: T[], slug: string): string | null {
    for (const item of items) {
        for (const tech of item.stack) {
            if (toTechSlug(tech) === slug) {
                return tech;
            }
        }
    }
    return null;
}

/**
 * Flattens a list of `stack` arrays (one per work item) into the distinct
 * set of tech slugs among them, order not significant — the reduction
 * half of `work.ts`'s `getPublishedTechSlugs`, split out so it can be
 * tested without a real Postgres (`work.ts`'s own query is the only part
 * that actually needs one).
 */
export function uniqueTechSlugs(stacks: string[][]): string[] {
    const slugs = new Set<string>();
    for (const stack of stacks) {
        for (const tech of stack) {
            slugs.add(toTechSlug(tech));
        }
    }
    return [...slugs];
}
