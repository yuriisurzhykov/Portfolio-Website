import * as simpleIcons from "simple-icons";
import type { SimpleIcon } from "simple-icons";

/**
 * Server-only by construction, not by an explicit marker package: every
 * caller of this module (`resolve-tech-icon.ts`, `search-brand-icons.ts`)
 * is only ever imported from a Server Component (`app/(site)/page.tsx`) or
 * a Route Handler (`/api/admin/tech-icons`) — never from a `"use client"`
 * file. This repo doesn't use the `server-only` package anywhere else
 * (see `frontend/README.md`), so this follows the same convention rather
 * than introducing a new one for a single slice. Importing `simple-icons`
 * (~3450 icons, a few MB of SVG path data) from client code would defeat
 * the entire point of resolving logos on the server — see
 * `next.config.ts`'s `serverExternalPackages` entry, which only keeps this
 * package OUT of the server bundle (`require()`d at runtime instead), not
 * out of a client one.
 */
let bySlug: Map<string, SimpleIcon> | null = null;

/**
 * Indexes the installed `simple-icons` package by each icon's own `.slug`
 * field — NOT by reconstructing the `si<PascalCase>` export name from a
 * guess. A handful of real exports don't follow a single predictable
 * casing rule (e.g. `siHive_blockchain`, `siBackstage_casting` keep an
 * underscore), so trusting the data's own `slug` field is the only way
 * this index is correct for every icon, not just the mechanically regular
 * ones. Built once per server process (module-level cache), not once per
 * request — the whole catalog is static for the life of the process.
 */
function buildIndex(): Map<string, SimpleIcon> {
    const index = new Map<string, SimpleIcon>();
    for (const icon of Object.values(simpleIcons)) {
        index.set(icon.slug, icon);
    }
    return index;
}

function getIndex(): Map<string, SimpleIcon> {
    // Forcing this check to always rebuild (`if (true)`) is a real mutant
    // Stryker finds, but it's equivalent in OUTPUT, not just "hard to
    // test": `Object.values(simpleIcons)` always returns references to
    // the SAME underlying icon objects (the installed package's own
    // module-level constants), so rebuilding the Map on every call still
    // maps every slug to the identical object a cached lookup would —
    // verified by hand (not just reasoned about): comparing `.get("docker")`
    // across two calls of both the cached and always-rebuilding versions
    // returned the same object reference either way. The only real
    // difference is the wasted CPU of reconstructing a ~3450-entry Map on
    // every call instead of once per process — a performance concern this
    // line exists for, not a behavioral one a test could observe.
    // Stryker disable next-line ConditionalExpression
    if (!bySlug) {
        bySlug = buildIndex();
    }
    return bySlug;
}

/** `undefined` for an unknown/mistyped slug — callers (`resolveTechIcon`, the admin icon-search route) treat that as "no logo available", never an error. */
export function getSimpleIconBySlug(slug: string): SimpleIcon | undefined {
    return getIndex().get(slug);
}

export function getAllSimpleIcons(): SimpleIcon[] {
    return [...getIndex().values()];
}
