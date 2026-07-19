import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DatabaseUnavailableError, isDatabaseConnectionError } from "../errors";

/**
 * A Prisma Client Extension (`$extends`), not a try/catch in every service
 * function — this is the ONE place that translates "can't reach the
 * database server" into our own `DatabaseUnavailableError` (see
 * ../errors.ts), and it applies automatically to every query on this
 * client, present and future. Without this, either every function in
 * content/posts.ts, content/work.ts, auth/session.ts, etc. would need its
 * own try/catch (repetitive, and easy to forget on a new function later),
 * or — what was actually happening before this existed — a raw
 * `PrismaClientKnownRequestError` with an internal hostname/port would
 * propagate all the way to a Next.js page and crash it with an
 * unstyled stack-trace overlay instead of a page anyone would want a
 * visitor to see.
 */
function withConnectionErrorTranslation(client: PrismaClient) {
    return client.$extends({
        query: {
            $allModels: {
                async $allOperations({ args, query }) {
                    try {
                        return await query(args);
                    } catch (error) {
                        if (isDatabaseConnectionError(error)) {
                            throw new DatabaseUnavailableError(error);
                        }
                        throw error;
                    }
                },
            },
        },
    });
}

/**
 * Singleton PrismaClient, reused across hot-reloads in `next dev`.
 *
 * Without this, every file change during development would create a brand
 * new PrismaClient (and a brand new PostgreSQL connection pool) on top of
 * the ones from the previous reload, until Postgres runs out of
 * connections — a well-known Next.js + Prisma gotcha, not specific to this
 * project. Stashing the instance on `globalThis` survives module reloads;
 * `NODE_ENV === "production"` skips the cache because production only
 * boots the module once anyway.
 */
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

function createPrismaClient() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    return withConnectionErrorTranslation(new PrismaClient({ adapter }));
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
