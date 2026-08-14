/**
 * Where this deployment lives, and whether it may be indexed. Changes for
 * exactly one reason: the deployment configuration changed.
 *
 * Deliberately a bare read of `process.env` with no validation and no
 * throwing. This module is imported by the ROOT layout, which is also the
 * parent of `/admin` and `/storybook` — and those are required to work
 * with zero dependency on external state (see the comment above
 * `metadata` in `app/layout.tsx`). An exception raised at import time here
 * would take the admin panel down to protect an SEO tag. Configuration is
 * validated once at process start instead, in `src/instrumentation.ts`.
 */

/** Origin with no trailing slash, `""` when unset — `metadataBase` and the two files that build raw URL strings (`robots.ts`, `sitemap.ts`) are the only readers. */
export const SITE_URL = (process.env.SITE_URL ?? "").replace(/\/+$/, "");

/**
 * Indexing is opt-IN: only the exact string `"true"` enables it.
 *
 * Any other value — unset, empty, `"1"`, a typo — means noindex. That
 * asymmetry is the point: dev machines, preview deployments and a
 * half-finished configuration are all safe by default, and the one
 * environment that must be indexable is the one that gets an explicit
 * variable. The cost is paid on the other side, at deploy time (see
 * `frontend/README.md` — production must have `SEO_INDEXABLE=true` in
 * place BEFORE this code ships, or the live site goes noindex).
 */
export const IS_INDEXABLE = process.env.SEO_INDEXABLE === "true";
