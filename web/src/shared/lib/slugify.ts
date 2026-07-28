/**
 * Turns a title into the exact slug shape `backend/src/content/slug.ts`'s
 * `slugSchema` accepts (`^[a-z0-9]+(?:-[a-z0-9]+)*$` — lowercase, digits,
 * single hyphens between words). Used by both `PostEditorPage` and
 * `WorkEditorPage` to auto-fill the slug field from the title as the
 * admin types, so slugs stop being something a person has to hand-craft
 * for every new post/project.
 *
 * Deliberately permissive about the INPUT (any title, any script/
 * punctuation) and strict about the OUTPUT (always matches the regex
 * above, or is `""` if nothing sluggable was left) — a title that's
 * entirely, say, Cyrillic or emoji collapses to an empty slug rather than
 * throwing; the caller (the admin form) already requires a non-empty slug
 * before submit, same as it always did.
 */
export function slugify(title: string): string {
    const collapsed = title
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "") // strip accents (é → e) after NFKD decomposition
        .replace(/[^a-z0-9]+/g, "-");
    // The `+` on each side below is provably redundant, not untested — the
    // `.replace()` above already collapses any RUN of non-alphanumeric
    // characters (including hyphens) into a single "-", so by the time this
    // line runs there can never be two adjacent hyphens anywhere in
    // `collapsed`, boundary included. Verified empirically across several
    // inputs (leading/trailing spaces, repeated punctuation, mixed runs)
    // before disabling, not assumed. Split into its own statement
    // (`collapsed`, not one long chain) specifically so this disable
    // comment unambiguously attaches to this one `.replace()` call — found
    // by testing, not assumed: chained onto the expression above, Stryker
    // silently failed to apply the disable at all.
    // Stryker disable next-line Regex
    return collapsed.replace(/^-+|-+$/g, "");
}
