/**
 * Shared between the auth API routes (Node runtime) and middleware.ts
 * (Edge runtime by default) — kept in a plain constants file with no
 * Node-specific imports so it's safe to import from either.
 */
export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60; // 15 minutes — mirrors backend/src/auth/jwt.ts
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days — mirrors backend/src/auth/session.ts
