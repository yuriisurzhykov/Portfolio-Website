import { prisma } from "../db/client";

/**
 * Wipes every table between tests. Simpler and more obviously correct than
 * per-test unique emails/IDs for a schema this small — a new table added
 * later just needs one more line here, not a redesign. Children before
 * parents (`Session` before `User`, `Post`/`Work` before `Document` before
 * `Block`): `Block.documentId`/`Session.userId` cascade on delete, but
 * deleting in dependency order is explicit rather than relying on cascade
 * behavior to do the right thing invisibly.
 */
export async function resetTestDatabase(): Promise<void> {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    // Before Post/Work — no FK ties these to either (see schema.prisma's
    // own comment, same polymorphism as `SlugHistory` below), but a stale
    // draft/revision row surviving into the next test can still collide on
    // `ContentDraft`'s `@@unique([kind, entityId])` if that test happens to
    // reuse the same `Post`/`Work` id (cuid collision odds are effectively
    // zero, but the leftover row would silently feed a WRONG draft into an
    // unrelated test either way, cuid collision or not).
    await prisma.contentDraft.deleteMany();
    await prisma.contentRevision.deleteMany();
    await prisma.post.deleteMany();
    await prisma.work.deleteMany();
    await prisma.block.deleteMany();
    await prisma.document.deleteMany();
    await prisma.siteContent.deleteMany();
    // No foreign key ties this to `Post`/`Work` (see schema.prisma's own
    // comment on why), so nothing cascades it away — leaving it out meant
    // rows surviving into the next test and colliding on
    // `@@unique([kind, formerSlug])`. Found by the tests themselves, which
    // is exactly the "one more line here" this function's comment predicts.
    await prisma.slugHistory.deleteMany();
}
