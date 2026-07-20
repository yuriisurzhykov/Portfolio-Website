export { login, logout, refreshSession } from "./auth/auth-service";
export type { AuthResult, AuthenticatedUser } from "./auth/auth-service";
export { revokeAllSessionsForUser } from "./auth/session";
export type { SessionMetadata } from "./auth/session";
export { signAccessToken, verifyAccessToken, ACCESS_TOKEN_TTL_SECONDS } from "./auth/jwt";
export type { AccessTokenPayload } from "./auth/jwt";
export { checkLoginRateLimit, recordFailedLogin, resetLoginRateLimit } from "./auth/rate-limit";
export type { RateLimitCheck } from "./auth/rate-limit";

export { getDistinctPostCategories, getJournalEntries, getLatestPublishedPost, getPostBySlug } from "./content/posts";
export type { PostDetail, PostStatus, PostSummary } from "./content/posts";
export { getAllWork, getFeaturedWork, getWorkBySlug } from "./content/work";
export type { CaseStudy, WorkDetail, WorkStatus, WorkSummary } from "./content/work";
export type { Block, BlockInput, BlockType } from "./content/blocks";
export type { LocalizedText } from "./content/localized-text";
export type { ContentLocale } from "./content/locale";

export { getSiteContent, isSiteContentKey, SITE_CONTENT_KEYS, siteContentSchemas, updateSiteContent } from "./content/site-content";
export type {
    ConfigContent,
    ContactContent,
    HeroContent,
    JournalPageContent,
    PrinciplesContent,
    SiteContentDataMap,
    SiteContentKey,
    TechStackContent,
    WorkPageContent,
} from "./content/site-content";
export { SITE_CONTENT_DEFAULTS } from "./content/site-content-defaults";

export {
    createPost,
    deletePost,
    getPostForAdmin,
    getPostTranslationForAdmin,
    postInputSchema,
    translatePost,
    translatePostInputSchema,
    updatePost,
} from "./content/admin-posts";
export type { AdminPostDetail, AdminPostTranslation, PostInput, TranslatePostInput } from "./content/admin-posts";
export {
    createWork,
    deleteWork,
    getWorkTranslationForAdmin,
    translateWork,
    translateWorkInputSchema,
    updateWork,
    workInputSchema,
} from "./content/admin-work";
export type { AdminWorkTranslation, TranslateWorkInput, WorkInput } from "./content/admin-work";

export {
    DatabaseUnavailableError,
    formatValidationError,
    isDatabaseConnectionError,
    isDatabaseUnavailableError,
    isSlugAlreadyExistsError,
    isUniqueConstraintError,
    isValidationError,
    SlugAlreadyExistsError,
} from "./errors";
