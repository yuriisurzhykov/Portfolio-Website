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

// `@upstash/redis` talks to Upstash over plain HTTPS (fetch), not a
// persistent TCP connection — no Node-only APIs, verified safe for Edge
// (see the Upstash SDK's own Cloudflare Workers/Vercel Edge support). Used
// by `frontend/src/proxy.ts` for the general per-IP rate-limit tiers.
export { checkRateLimit, InMemoryRateLimiter, setRateLimiterForTesting } from "./auth/rate-limit";
export type { RateLimitCheck, RateLimiter } from "./auth/rate-limit";
