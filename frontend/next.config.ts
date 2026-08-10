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
  // @portfolio/backend (npm workspace package, see /backend and frontend/README.md)
  // ships its own TypeScript source with no build step of its own — Next.js
  // only compiles its own app code by default, so packages outside it are
  // normally treated as pre-built JS. transpilePackages tells Next.js to run
  // its own compiler over this package's source too.
  transpilePackages: ["@portfolio/backend"],
  // `simple-icons` (frontend/src/shared/lib/tech-icons) is ~3450 brand SVG
  // icons — a few MB of path data nobody's browser needs to download. This
  // keeps it OUT of the Server Components/Route Handlers bundle Next.js
  // would otherwise produce (it's `require()`d from real `node_modules` at
  // runtime instead); it was never going to be in the CLIENT bundle in the
  // first place, since every import of it lives behind the server-only
  // boundary documented in `tech-icons/registry.ts`'s top comment.
  serverExternalPackages: ["simple-icons"],
  // Next.js sends "X-Powered-By: Next.js" on every response by default —
  // a free hint to an attacker about which framework-specific CVEs to try.
  poweredByHeader: false,
  // No `headers()` declaring `Vary: x-locale` here, deliberately — it was
  // tried and removed. Next.js overwrites `Vary` with its own list on
  // Server-Component pages (it survives only on route handlers), so the
  // one place it was needed is the one place it never arrived; verified
  // with `curl -D -` against a real production build. `proxy.ts` carries
  // the locale in the rewritten URL instead, which makes every response a
  // pure function of its URL and removes the need for `Vary` at all — see
  // `handleLocale`'s comment.
};

export default nextConfig;
