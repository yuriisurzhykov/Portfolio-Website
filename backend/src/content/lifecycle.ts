export type LifecycleState = "DRAFT" | "PUBLISHED";
export type LifecycleAction = "PUBLISH" | "UNPUBLISH";

/**
 * Thrown by `nextState()` for a transition the graph doesn't allow — named
 * by name, not `instanceof`, for the same cross-bundle reason as
 * `SlugAlreadyExistsError` (see `errors.ts`'s comment): Next.js/Turbopack
 * compiles `@portfolio/backend` separately per execution context, so an
 * `instanceof` check against this class can silently evaluate to `false`
 * across that boundary.
 */
export class InvalidLifecycleTransitionError extends Error {
    constructor(current: LifecycleState, action: LifecycleAction) {
        super(`Cannot ${ action } a record that is already ${ current }.`);
        this.name = "InvalidLifecycleTransitionError";
    }
}

export function isInvalidLifecycleTransitionError(error: unknown): boolean {
    return error instanceof Error && error.name === "InvalidLifecycleTransitionError";
}

/**
 * The entire DRAFT/PUBLISHED transition graph for Post AND Work — one pure
 * function, no Prisma/HTTP import, shared by `admin-posts.ts`/
 * `admin-work.ts` so the two content types can never quietly drift onto
 * different rules for "what publishing even means." A third state later
 * (e.g. `SCHEDULED` — see the plan's "явно НЕ делаем сейчас") is a new
 * `case` branch here, not a rewrite of the callers.
 *
 * PUBLISH is idempotent — publishing an already-published record is a
 * no-op, not an error, since the caller (a "Publish" button rendered only
 * for DRAFT records, or a repeated API call) has no reliable way to know
 * the exact state at the instant it acts. UNPUBLISH has no such excuse: the
 * "Unpublish" button only ever renders for a PUBLISHED record, so
 * unpublishing an already-DRAFT one signals a real state mismatch (a stale
 * client, a duplicate submit) worth surfacing rather than silently
 * swallowing.
 */
export function nextState(current: LifecycleState, action: LifecycleAction): LifecycleState {
    switch (action) {
        case "PUBLISH":
            return "PUBLISHED";
        case "UNPUBLISH":
            if (current === "DRAFT") {
                throw new InvalidLifecycleTransitionError(current, action);
            }
            return "DRAFT";
    }
}
