/**
 * Edge-runtime-safe subset of this package's public API — import this
 * (`@portfolio/backend/edge`), not the main entry point, from anything that
 * might run on the Edge runtime (e.g. web/src/middleware.ts). The main
 * entry point (./index.ts) re-exports session/login logic that pulls in
 * Prisma, `pg`, and `node:crypto` (via auth/tokens.ts) — none of which work
 * on Edge. Turbopack only *warns* about this rather than hard-failing the
 * build, which makes it an easy mistake to ship unnoticed; see
 * web/README.md's journal entry for how this was found. Only ever add
 * exports here that are verified not to transitively import Node-only
 * modules.
 */
export { signAccessToken, verifyAccessToken, ACCESS_TOKEN_TTL_SECONDS } from "./auth/jwt";
export type { AccessTokenPayload } from "./auth/jwt";
