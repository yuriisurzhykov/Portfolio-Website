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
 * 3. Only then is the new row written.
 *
 * Not wrapped in a transaction, matching this module's neighbours: one
 * admin edits sequentially, and `admin-posts.ts`'s `assertSlugAvailable`
 * already documents the same accepted check-then-act race.
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
    await prisma.slugHistory.create({ data: { kind, formerSlug, currentSlug } });
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
    await prisma.slugHistory.deleteMany({
        where: { kind, OR: [{ currentSlug: slug }, { formerSlug: slug }] },
    });
}
