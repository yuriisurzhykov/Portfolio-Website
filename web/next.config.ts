import path from "node:path";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

// backend/.env is the single canonical source for DATABASE_URL and the JWT
// secrets (see backend/README.md's env-var journal entry) — Prisma CLI
// reads it automatically because it sits next to schema.prisma, but this
// Next.js process has no equivalent auto-load for a file outside its own
// project root, so it's loaded explicitly, once, here. next.config.ts runs
// once at process startup in the same long-lived Node process that serves
// every later request, so anything set on process.env here is still set
// for every request handler/Server Component afterwards.
loadEnv({ path: path.resolve(__dirname, "../backend/.env") });

const nextConfig: NextConfig = {
  // @portfolio/backend (npm workspace package, see /backend and web/README.md)
  // ships its own TypeScript source with no build step of its own — Next.js
  // only compiles its own app code by default, so packages outside it are
  // normally treated as pre-built JS. transpilePackages tells Next.js to run
  // its own compiler over this package's source too.
  transpilePackages: ["@portfolio/backend"],
};

export default nextConfig;
