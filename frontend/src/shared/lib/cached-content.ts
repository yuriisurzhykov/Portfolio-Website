import { cache } from "react";
import { getPostBySlug, getSiteContent, getWorkBySlug } from "@portfolio/backend";

/**
 * Request-scoped memoized reads, shared by layouts, pages and
 * `generateMetadata`.
 *
 * ONE module, not a wrapper per call site, and that is a correctness
 * requirement rather than tidiness: React's own documentation states that
 * every call to `cache()` creates a new function and that different
 * memoized functions do not share a cache. Two independent
 * `cache(getSiteContent)` calls — one in a layout, one in a page — are two
 * caches and two queries. Importing the same binding is what makes the
 * deduplication happen at all.
 *
 * The rule that gets broken silently: **`cache(fn)` is only ever
 * evaluated at module level.** Calling `cache(getPostBySlug)` inside a
 * component body or inside `generateMetadata` builds a fresh memoized
 * function per invocation, deduplicates nothing, and produces neither an
 * error nor a warning.
 *
 * Not in `shared/lib/seo/`: reading content once per request is what
 * layouts, pages and metadata all need equally — it is not an SEO
 * concern, SEO is just what made the second reader appear.
 */
export const cachedSiteContent = cache(getSiteContent);
export const cachedPostBySlug = cache(getPostBySlug);
export const cachedWorkBySlug = cache(getWorkBySlug);
