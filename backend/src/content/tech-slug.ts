import { slugify } from "./slugify";

/**
 * Symbols that ARE the name, not punctuation around it — spelled out as
 * words before slugifying.
 *
 * Fixes a real collision, reported in review against the first version of
 * this file (which called `slugify` directly): `slugify` deletes every
 * non-alphanumeric run, so `"C++"` and `"C#"` BOTH became `"c"`. That was
 * not a cosmetic slug problem — it propagated to every consumer below at
 * once. `uniqueTechSlugs` reported one tech where the stack had two, so
 * both landing-page logos linked to the same `/work?tech=c`;
 * `filterWorkByTechSlug` then returned the C++ projects AND the C#
 * projects for that one filter; and `findTechDisplayName` labelled the
 * merged result with whichever of the two spellings happened to appear
 * first in the list. Same class of "punctuation carries the meaning" case
 * `SIMPLE_ICON_SLUG_ALIASES` below already handles for Simple Icons — and
 * the same fix Simple Icons itself picked (`cplusplus`, `csharp`),
 * arrived at independently here rather than reused, because that table
 * maps to an EXTERNAL vendor's slugs and this one has to stay readable in
 * our own URLs (`/work?tech=c-plus-plus`).
 *
 * Deliberately tiny, and deliberately not a general punctuation
 * transliteration: `&`, `/` and `.` are separators in practice
 * ("Coroutines & Flow", "CI/CD", "Node.js"), and spelling THOSE out would
 * make every slug worse to read while fixing nothing — none of them is
 * ever the only thing distinguishing two real technologies. Add an entry
 * here only for a symbol that genuinely carries a name apart, and add a
 * test pinning the two names it separates.
 *
 * Note that the reverse direction now merges: a name typed as
 * `"C plus plus"` slugs the same as `"C++"`. That's the intended
 * behaviour, not a leak — it's the same "typed slightly differently"
 * equivalence `toTechSlug` exists to provide.
 */
const SLUG_SYMBOL_WORDS: Readonly<Record<string, string>> = {
    "+": "plus",
    "#": "sharp",
};

/** `split`/`join` rather than a `RegExp` built from the table's keys — the keys are punctuation, so a regex would need escaping logic that has to stay correct as the table grows. */
function spellOutSymbols(name: string): string {
    let expanded = name;
    for (const [symbol, word] of Object.entries(SLUG_SYMBOL_WORDS)) {
        expanded = expanded.split(symbol).join(` ${ word } `);
    }
    return expanded;
}

/**
 * A tech name's stable, URL-safe identifier — `slugify.ts`'s exact
 * normalization (lowercase, strip accents, non-alphanumeric runs → `-`),
 * applied after {@link SLUG_SYMBOL_WORDS} spells out the handful of
 * symbols that would otherwise be deleted along with their meaning.
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
 *
 * Known limit, accepted rather than engineered around: a name with no
 * latin alphanumerics at all (say, an all-Cyrillic one) still slugs to
 * `""`, and two such names would collide with each other the way `"C++"`
 * and `"C#"` used to. Every value this runs on is a technology's proper
 * name, which is latin in practice, so an encoding scheme for that case
 * would be machinery for a situation that hasn't occurred — but it IS the
 * same failure mode, so it's named here rather than left to be
 * rediscovered.
 */
export function toTechSlug(name: string): string {
    return slugify(spellOutSymbols(name));
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
