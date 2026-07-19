import { NextResponse } from "next/server";
import { isDatabaseUnavailableError } from "@portfolio/backend";

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
export function toErrorResponse(error: unknown): NextResponse {
    if (isDatabaseUnavailableError(error)) {
        return NextResponse.json(
            { error: "Service temporarily unavailable. Please try again shortly." },
            { status: 503, headers: { "Retry-After": "30" } },
        );
    }
    throw error;
}
