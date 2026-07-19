import { prisma } from "../db/client";

/**
 * Wipes every table between tests. Simpler and more obviously correct than
 * per-test unique emails/IDs for a schema this small (two tables) — a new
 * table added later just needs one more line here, not a redesign.
 * `Session` first: `User` has `onDelete: Cascade` from Session, but
 * deleting in this order is explicit rather than relying on cascade
 * behavior to do the right thing invisibly.
 */
export async function resetTestDatabase(): Promise<void> {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
}
