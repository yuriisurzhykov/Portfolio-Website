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
    discardPostDraft,
    getPostForAdmin,
    getPostPreview,
    getPostsForAdmin,
    getPostTranslationForAdmin,
    listPostRevisions,
    postDraftInputSchema,
    publishPost,
    restorePostRevision,
    savePostDraft,
    translatePost,
    translatePostInputSchema,
    unpublishPost,
} from "./content/admin-posts";
export type { AdminPostDetail, AdminPostListItem, AdminPostTranslation, PostInput, TranslatePostInput } from "./content/admin-posts";
export {
    createWork,
    deleteWork,
    discardWorkDraft,
    getWorkDetailForAdmin,
    getWorkForAdmin,
    getWorkPreview,
    getWorkTranslationForAdmin,
    listWorkRevisions,
    publishWork,
    restoreWorkRevision,
    saveWorkDraft,
    translateWork,
    translateWorkInputSchema,
    unpublishWork,
    workDraftInputSchema,
} from "./content/admin-work";
export type { AdminWorkDetail, AdminWorkListItem, AdminWorkTranslation, TranslateWorkInput, WorkInput } from "./content/admin-work";
export type { RevisionSummary } from "./content/content-draft";

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

export {
    clearPostCover,
    coverUrlFor,
    ensureCoverIsCurrent,
    generateCoverForPost,
    regenerateCoverForPost,
    resolveCategoryHue,
    resolveIdentityHue,
    resolvePostHue,
    resolveWorkHue,
    setPostCover,
} from "./media/covers";
export type { CoverImageData, CoverSourcePost } from "./media/covers";
export { ensureWorkCoverIsCurrent, generateCoverForWork, regenerateCoverForWork } from "./media/work-covers";
export type { CoverSourceWork } from "./media/work-covers";
export { CURRENT_COVER_STYLE_VERSION, buildCoverBrief } from "./media/cover-brief";
export type { CoverBrief, CoverBriefInput } from "./media/cover-brief";
export {
    FailingImageGenerator,
    getImageGenerator,
    ImageGenerationError,
    isImageGenerationError,
    ProceduralImageGenerator,
    setImageGeneratorForTesting,
} from "./media/image-generator";
export type { GeneratedImage, ImageGenerator } from "./media/image-generator";
export {
    DiskMediaStore,
    getMediaStore,
    resolveMediaRootDir,
    setMediaStoreForTesting,
    UnsafeStorageKeyError,
} from "./media/media-store";
export type { MediaStore } from "./media/media-store";
export { hueForOrdinal, oklchToSrgbHex } from "./media/cover-hue";
