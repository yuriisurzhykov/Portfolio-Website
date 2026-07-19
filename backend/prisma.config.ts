import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 moved the connection URL (and shadow DB URL) out of schema.prisma
// and into this file — the CLI (migrate/studio/db push) reads it from here.
// The running app never goes through this file; PrismaClient itself is
// constructed with an explicit @prisma/adapter-pg adapter in
// src/db/client.ts, per Prisma 7's "driver adapters are mandatory" change.
export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: env("DATABASE_URL"),
    },
});
