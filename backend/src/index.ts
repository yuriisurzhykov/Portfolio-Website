export { login, logout, refreshSession } from "./auth/auth-service";
export type { AuthResult, AuthenticatedUser } from "./auth/auth-service";
export { revokeAllSessionsForUser } from "./auth/session";
export type { SessionMetadata } from "./auth/session";
export { signAccessToken, verifyAccessToken, ACCESS_TOKEN_TTL_SECONDS } from "./auth/jwt";
export type { AccessTokenPayload } from "./auth/jwt";
export { checkLoginRateLimit, recordFailedLogin, resetLoginRateLimit } from "./auth/rate-limit";
export type { RateLimitCheck } from "./auth/rate-limit";

export { getJournalEntries, getLatestPublishedPost, getPostBySlug } from "./content/posts";
export type { PostDetail, PostStatus, PostSummary } from "./content/posts";
export { getAllWork, getFeaturedWork, getWorkBySlug } from "./content/work";
export type { CaseStudy, WorkDetail, WorkStatus, WorkSummary } from "./content/work";
export type { Block, BlockType, LocalizedText } from "./content/blocks";

export { DatabaseUnavailableError, isDatabaseConnectionError, isDatabaseUnavailableError } from "./errors";
