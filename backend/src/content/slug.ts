import { z } from "zod";
import { slugify } from "./slugify";

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

/**
 * Derives a guaranteed-unique slug for a NEW record when the soft draft
 * contract's `slug` field is omitted (see admin-posts.ts's
 * `postDraftInputSchema`) — the server-side counterpart to the admin
 * editor's client-side slug preview. `isTaken` is injected rather than
 * this function calling `prisma.post`/`prisma.work` itself, so ONE
 * implementation serves both models without importing either Prisma
 * delegate into a file that otherwise knows nothing about Post/Work
 * (Interface Segregation — same reasoning `posts.ts`/`work.ts` already
 * apply to `ContentLocale`).
 *
 * `"untitled"` is the fallback base (not `""`) for a title with nothing
 * sluggable left after `slugify()` (e.g. a title that's entirely emoji or
 * Cyrillic) — an empty base would otherwise produce bare numeric slugs
 * ("-2", "-3", ...) on the second and later such title, which fail
 * `slugSchema`.
 */
export async function generateUniqueSlug(title: string, isTaken: (candidate: string) => Promise<boolean>): Promise<string> {
    const base = slugify(title) || "untitled";
    if (!(await isTaken(base))) {
        return base;
    }
    for (let suffix = 2; ; suffix++) {
        const candidate = `${ base }-${ suffix }`;
        if (!(await isTaken(candidate))) {
            return candidate;
        }
    }
}
