/**
 * Server-side port of `frontend/src/shared/lib/slugify.ts`'s algorithm —
 * character-for-character identical on purpose, not imported across the
 * package boundary: `backend/` has no business depending on `frontend/`
 * (that would invert this repo's dependency direction), and this is a
 * tiny, pure, zero-dependency function — duplicating it costs far less
 * than the coupling would. Needed now that a new record's `slug` is
 * optional in the soft draft contract (see admin-posts.ts's
 * `postDraftInputSchema`) — the server must be able to derive one itself,
 * not just validate one the client already computed.
 *
 * Deliberately permissive about the INPUT (any title, any script/
 * punctuation) and strict about the OUTPUT (always matches
 * `slug.ts`'s `slugSchema`, or is `""` if nothing sluggable was left) —
 * `generateUniqueSlug` (`slug.ts`) is what turns a possibly-empty result
 * into a real fallback slug.
 */
export function slugify(title: string): string {
    const collapsed = title
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "") // strip accents (é → e) after NFKD decomposition
        .replace(/[^a-z0-9]+/g, "-");
    return collapsed.replace(/^-|-$/g, "");
}
