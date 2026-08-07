import "dotenv/config";
import { prisma } from "../src/db/client";
import { deleteExpiredSessions } from "../src/auth/session";

/**
 * Thin CLI wrapper around `deleteExpiredSessions()` (`src/auth/session.ts`
 * — the actual business rule, independently tested there) — meant to be
 * invoked by a cron entry (see `.scripts/provision/README.md`'s entry for
 * this script), the same "business logic in a plain function, thin script
 * around it" split `create-admin-user.ts`/`create-admin.ts` already
 * established for the same reason: a plain function is directly testable
 * and directly reusable from anywhere this package is imported, without
 * needing to spawn a subprocess or parse stdout.
 */
async function main() {
    const deleted = await deleteExpiredSessions();
    console.log(`Deleted ${ deleted } expired session row(s).`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
