export { login, logout, refreshSession } from "./auth/auth-service";
export type { AuthResult, AuthenticatedUser } from "./auth/auth-service";
export { deleteExpiredSessions, revokeAllSessionsForUser } from "./auth/session";
export type { SessionMetadata } from "./auth/session";
export { signAccessToken, verifyAccessToken, ACCESS_TOKEN_TTL_SECONDS } from "./auth/jwt";
export type { AccessTokenPayload } from "./auth/jwt";
export { checkLoginRateLimit, checkRateLimit, resetLoginRateLimit } from "./auth/rate-limit";
export type { RateLimitCheck } from "./auth/rate-limit";
export { logAuditEvent } from "./audit-log";

export { getDistinctPostCategories, getJournalEntries, getLatestPublishedPost, getPostBySlug } from "./content/posts";
export type { PostDetail, PostStatus, PostSummary } from "./content/posts";
export { getAllWork, getFeaturedWork, getPublishedTechSlugs, getWorkBySlug } from "./content/work";
export type { CaseStudy, WorkDetail, WorkStatus, WorkSummary } from "./content/work";
export { filterWorkByTechSlug, findTechDisplayName, toSimpleIconSlug, toTechSlug } from "./content/tech-slug";
export type { Block, BlockInput, BlockType, ListItemInput } from "./content/blocks";
export type { LocalizedText } from "./content/localized-text";
export type { ContentLocale } from "./content/locale";
export { isInvalidLifecycleTransitionError, nextState } from "./content/lifecycle";
export type { LifecycleAction, LifecycleState } from "./content/lifecycle";
export { setContentChangeNotifier } from "./content/content-change-notifier";
export type { ContentChange, ContentChangeNotifier } from "./content/content-change-notifier";
export { findCurrentSlug } from "./content/slug-history";
export type { ContentKind } from "./content/slug-history";

export { getSiteContent, iconRefSchema, isSiteContentKey, SITE_CONTENT_KEYS, siteContentSchemas, techIconSchema, updateSiteContent } from "./content/site-content";
export type {
    ConfigContent,
    ContactContent,
    HeroContent,
    IconRef,
    JournalPageContent,
    PrinciplesContent,
    SiteContentDataMap,
    SiteContentKey,
    TechIcon,
    TechStackContent,
    WorkPageContent,
} from "./content/site-content";
export { SITE_CONTENT_DEFAULTS } from "./content/site-content-defaults";

export {
    createPost,
    deletePost,
    getPostForAdmin,
    getPostsForAdmin,
    getPostTranslationForAdmin,
    postDraftInputSchema,
    publishPost,
    translatePost,
    translatePostInputSchema,
    unpublishPost,
    updatePost,
} from "./content/admin-posts";
export type { AdminPostDetail, AdminPostTranslation, PostInput, TranslatePostInput } from "./content/admin-posts";
export {
    createWork,
    deleteWork,
    getWorkDetailForAdmin,
    getWorkForAdmin,
    getWorkTranslationForAdmin,
    publishWork,
    translateWork,
    translateWorkInputSchema,
    unpublishWork,
    updateWork,
    workDraftInputSchema,
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
