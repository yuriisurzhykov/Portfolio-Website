import { NextResponse } from "next/server";
import { formatValidationError, isDatabaseUnavailableError, isSlugAlreadyExistsError, isValidationError } from "@portfolio/backend";

/**
 * Reused by every auth Route Handler that touches the database
 * (login/refresh/logout) — without this, a `DatabaseUnavailableError`
 * thrown mid-request became an unhandled rejection that Next.js turns into
 * a bare 500 with no JSON body, which every caller of this API (the admin
 * UI today, Phase 4; a future mobile client) would have to special-case
 * detecting. A real 503 + Retry-After is the correct HTTP-level signal for
 * "this is temporary, retry me" — distinct from a 500 (which says
 * "something is broken," not "come back in a moment").
 *
 * `isDatabaseUnavailableError(error)`, not `error instanceof
 * DatabaseUnavailableError` — see the comment on that function in
 * backend/src/errors.ts. Found by actually stopping the database and
 * hitting this route: the `instanceof` version silently fell through to
 * `throw error` (a bare 500) every time, because Route Handlers and Server
 * Components compile `@portfolio/backend` as separate bundles.
 */
/**
 * Extended in Phase 4 for the new `/api/admin/posts`/`/api/admin/work`
 * CRUD routes: `SlugAlreadyExistsError` → 409 (the request was understood,
 * but conflicts with an existing resource) and a Zod `ZodError` from
 * `postInputSchema`/`workInputSchema`.parse() → 400 (the request itself
 * was malformed) — both are as reusable across every admin route as the
 * original 503 case was across the three auth routes, so they belong here
 * rather than repeated per-route.
 */
export function toErrorResponse(error: unknown): NextResponse {
    if (isDatabaseUnavailableError(error)) {
        return NextResponse.json(
            { error: "Service temporarily unavailable. Please try again shortly." },
            { status: 503, headers: { "Retry-After": "30" } },
        );
    }
    if (isSlugAlreadyExistsError(error)) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Slug already exists." }, { status: 409 });
    }
    if (isValidationError(error)) {
        return NextResponse.json({ error: formatValidationError(error) }, { status: 400 });
    }
    throw error;
}
