import { prisma } from "../db/client";

/** Which content type a slug belongs to — the same two-value set `ContentChange.kind` uses, named once. */
export type ContentKind = "post" | "work";

/**
 * Records that `formerSlug` used to address the entity now living at
 * `currentSlug`, so the old address can keep working.
 *
 * Three things happen here, and every one of them is a bug if omitted:
 *
 * 1. **Existing rows pointing at `formerSlug` are re-pointed at
 *    `currentSlug`.** Renaming a→b→c must leave `a → c`, not `a → b → c`:
 *    a crawler following a redirect chain loses signal at every hop, and
 *    some stop following after a few.
 * 2. **A row whose `formerSlug` IS the new slug is deleted.** Rename a→b
 *    and then b→a, and without this the table holds `a → b` and `b → a`
 *    at once — an infinite redirect, on the entity's own live URL.
 * 3. The row for `formerSlug` is UPSERTED, not created.
 *
 * Step 3 was a plain `create`, and that was a real bug found in review:
 * a slug can be a former address of one entity and later a live address
 * of another (`assertSlugAvailable` only looks at live rows — see
 * `claimSlug`). Renaming that second entity away then hit the unique
 * constraint on `(kind, formerSlug)` — and because this runs AFTER the
 * entity's own `update` has committed, the caller saw a failure for a
 * rename that had actually happened, and retrying with the old slug 404'd.
 * `claimSlug` now prevents that state from arising at all; the upsert is
 * what keeps this function correct anyway, including for rows written
 * before that fix existed.
 *
 * Last writer wins, which is the only defensible rule: whoever vacated
 * the address most recently is who a visitor following that old link most
 * likely meant.
 *
 * Not wrapped in a transaction, matching this module's neighbours: one
 * admin edits sequentially, and `admin-posts.ts`'s `assertSlugAvailable`
 * already documents the same accepted check-then-act race. The window
 * that leaves is a degradation, never corruption — a failure between the
 * entity's `update` and this call means the old address 404s instead of
 * redirecting, which is exactly what it did before this table existed.
 */
export async function recordSlugChange(kind: ContentKind, formerSlug: string, currentSlug: string): Promise<void> {
    if (formerSlug === currentSlug) {
        return;
    }

    await prisma.slugHistory.updateMany({
        where: { kind, currentSlug: formerSlug },
        data: { currentSlug },
    });
    await prisma.slugHistory.deleteMany({ where: { kind, formerSlug: currentSlug } });
    await prisma.slugHistory.upsert({
        where: { kind_formerSlug: { kind, formerSlug } },
        create: { kind, formerSlug, currentSlug },
        update: { currentSlug },
    });
}

/**
 * Releases any redirect that pointed at `slug`, because a NEW entity is
 * taking that address over.
 *
 * Called by `createPost`/`createWork`. Their `assertSlugAvailable` only
 * checks live rows, so a slug that some other entity moved away from is
 * genuinely free to reuse — but the old `slug → …` row is wrong the moment
 * that happens. It stays dormant while the new entity is live (the read
 * side prefers the real entity, see `findCurrentSlug`) and then comes back
 * to life if that entity is ever deleted, silently redirecting its address
 * to an unrelated post.
 */
export async function claimSlug(kind: ContentKind, slug: string): Promise<void> {
    await deleteSlugRowsFor(kind, slug);
}

/**
 * Where the entity that used to live at `formerSlug` lives now, or `null`
 * if that slug was never in use.
 *
 * Deliberately returns a SLUG, not a URL: which path and locale prefix an
 * entity is served under is a delivery detail this package doesn't know
 * about — the same boundary `ContentChangeNotifier` draws. The caller
 * turns it into a redirect.
 *
 * Callers must look up the real entity FIRST and only fall back to this:
 * a slug that is currently in use by something must serve that thing, even
 * if it also happens to be some other entity's former address.
 */
export async function findCurrentSlug(kind: ContentKind, formerSlug: string): Promise<string | null> {
    const row = await prisma.slugHistory.findUnique({ where: { kind_formerSlug: { kind, formerSlug } } });
    return row?.currentSlug ?? null;
}

/**
 * Drops every former address of a deleted entity.
 *
 * Without this a rename-then-delete leaves a redirect pointing at a slug
 * that 404s — strictly worse than the old address 404ing directly, since
 * the crawler pays for a hop and lands on the same nothing.
 */
export async function forgetSlugHistory(kind: ContentKind, slug: string): Promise<void> {
    await deleteSlugRowsFor(kind, slug);
}

/**
 * Shared by `claimSlug` and `forgetSlugHistory` — identical effect, two
 * genuinely different reasons, hence two named callers rather than one
 * function doing double duty at both call sites. Reading
 * `forgetSlugHistory` inside `createPost` would be a puzzle.
 *
 * Both directions are removed: rows where this slug is the OLD address
 * (they would redirect away from an address that is now live or gone) and
 * rows where it is the DESTINATION (they would redirect to it).
 */
async function deleteSlugRowsFor(kind: ContentKind, slug: string): Promise<void> {
    await prisma.slugHistory.deleteMany({
        where: { kind, OR: [{ currentSlug: slug }, { formerSlug: slug }] },
    });
}
