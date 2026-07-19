import { z } from "zod";

/**
 * Shared by admin-posts.ts and admin-work.ts — both `Post.slug` and
 * `Work.slug` are URL path segments (`/journal/:slug`, `/work/:slug`), so
 * both need the exact same "is this safe/sane as a URL segment" rule.
 * Lowercase + digits + single hyphens between words, matching every slug
 * already in the imported content (see scripts/import-legacy-content.ts).
 */
export const slugSchema = z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and single hyphens (e.g. \"my-post-title\").");
