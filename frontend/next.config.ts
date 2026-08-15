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

// `MEDIA_DIR` (backend/src/media/media-store.ts's `resolveMediaRootDir()`)
// defaults to a path built from ITS OWN `__dirname` — which works correctly
// when that file runs unbundled (a `tsx` script, a Vitest test), but not
// here: `transpilePackages` compiles `@portfolio/backend` into this Next.js
// server's own bundle under `.next/server/...`, so `__dirname` inside that
// bundled copy no longer points at `backend/src/media` at all. Found LIVE —
// `frontend/src/app/media/[...path]/route.ts` 404ing on a file that
// genuinely existed on disk at the path the BACKEND process (running the
// seed script directly) had written it to — not by reasoning about
// Turbopack's bundling ahead of time. Same root cause this repo has already
// hit once before with `instanceof` across a transpiled-package boundary
// (see backend/src/errors.ts's own comment) — a bundled copy of a package
// cannot trust anything computed relative to ITS OWN module location.
//
// Fixed by computing the value here instead, in `next.config.ts` — this
// file is loaded directly by Node at process startup, never bundled by
// Turbopack, so `__dirname` here reliably means "the real frontend/
// directory" in every execution context (`next dev`, `next build`, `next
// start`). Only sets it if unset, so a real deployment's explicit
// `MEDIA_DIR` (a different absolute path per provisioned target — see
// backend/src/media/README.md's "Хранилище" entry) is never overridden.
if (!process.env.MEDIA_DIR) {
  process.env.MEDIA_DIR = path.resolve(__dirname, "../backend/media");
}

// Same problem, same fix, for `backend/src/media/cover-fonts.ts`'s embedded
// TTF subsets (the procedural cover generator's readable-title/letterform/
// stamp layers) — see the comment above for the full story.
if (!process.env.COVER_FONTS_DIR) {
  process.env.COVER_FONTS_DIR = path.resolve(__dirname, "../backend/src/media/fonts");
}

const nextConfig: NextConfig = {
  // @portfolio/backend (npm workspace package, see /backend and frontend/README.md)
  // ships its own TypeScript source with no build step of its own — Next.js
  // only compiles its own app code by default, so packages outside it are
  // normally treated as pre-built JS. transpilePackages tells Next.js to run
  // its own compiler over this package's source too.
  //
  // @portfolio/design-tokens (packages/design-tokens) is, by design, never
  // imported by anything the Next.js app actually bundles — its compiler is
  // a build-time-only dependency of scripts/generate-design-tokens.ts (a
  // plain `tsx` script), and every runtime adapter reads the generated,
  // already-resolved output instead. Listed here anyway, defensively: the
  // same "raw TS source, no build step" shape as @portfolio/backend, so if
  // a future change ever does import it from app code, it transpiles
  // correctly on the first try instead of failing with a confusing
  // ESM/CJS or "cannot use import outside a module" error.
  transpilePackages: ["@portfolio/backend", "@portfolio/design-tokens"],
  // `simple-icons` (frontend/src/shared/lib/tech-icons) is ~3450 brand SVG
  // icons — a few MB of path data nobody's browser needs to download. This
  // keeps it OUT of the Server Components/Route Handlers bundle Next.js
  // would otherwise produce (it's `require()`d from real `node_modules` at
  // runtime instead); it was never going to be in the CLIENT bundle in the
  // first place, since every import of it lives behind the server-only
  // boundary documented in `tech-icons/registry.ts`'s top comment.
  //
  // `sharp` (backend/src/media/image-processing.ts) is a native binary
  // (prebuilt .node addon per platform) — bundling it would either fail
  // outright or duplicate a multi-MB native binary into the server bundle
  // for no benefit; like simple-icons, it's server-only by construction
  // (never imported from client code) and gains nothing from being
  // transpiled/bundled.
  serverExternalPackages: ["simple-icons", "sharp"],
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
