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
    await prisma.post.deleteMany();
    await prisma.work.deleteMany();
    await prisma.block.deleteMany();
    await prisma.document.deleteMany();
    await prisma.siteContent.deleteMany();
}
