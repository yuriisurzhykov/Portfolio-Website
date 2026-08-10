import { Prisma } from "@prisma/client";

/**
 * Thrown instead of letting a raw Prisma/`pg` connection error propagate —
 * see db/client.ts, which is the one place that does this translation for
 * every query in the app. Deliberately a plain, local `Error` subclass (not
 * re-exporting anything from `@prisma/client`): callers in `web/` (Server
 * Components, Route Handlers) should only ever need to know "the database
 * was unreachable," not which driver or Prisma error class produced that —
 * that's an implementation detail of this package, not something the rest
 * of the app should be coupled to.
 */
export class DatabaseUnavailableError extends Error {
    constructor(cause?: unknown) {
        super("The database is temporarily unavailable.");
        this.name = "DatabaseUnavailableError";
        this.cause = cause;
    }
}

/**
 * Prisma's own error CODES for "the server could not be reached, reached
 * too slowly, or hung up" — matching on codes, not on `error.message`
 * text, is what keeps this working across Prisma versions: message strings
 * aren't a stable contract, codes are. See
 * https://www.prisma.io/docs/orm/reference/error-reference.
 *
 * `P1000` (authentication failed) is deliberately absent: that is a
 * misconfigured deployment, not an outage, and swallowing it into a
 * friendly "try again later" page would hide a bug that no amount of
 * waiting fixes.
 */
const PRISMA_UNREACHABLE_CODES = new Set([
    "P1001", // Can't reach database server
    "P1002", // Server was reached but timed out
    "P1017", // Server has closed the connection
]);

/**
 * Socket-level codes that arrive INSTEAD of a `P1…` code.
 *
 * Found from a failing CI build, not by reading Prisma's docs: with a
 * driver adapter (`@prisma/adapter-pg`, required since Prisma 7 — see
 * `db/client.ts`), a connection failure can surface as a
 * `PrismaClientKnownRequestError` whose `code` is the raw Node socket
 * error — `ECONNREFUSED` — rather than being mapped to `P1001`. The build
 * prerenders `/opengraph-image`, which reads `SiteContent`, against a
 * placeholder `DATABASE_URL` with nothing listening; the error escaped
 * this classifier, so it was never translated into
 * `DatabaseUnavailableError`, so the graceful fallback that exists for
 * exactly this case declined to handle it and the build died.
 *
 * The build was only the messenger. The same gap meant a production
 * Postgres refusing connections in this shape would have crashed pages to
 * `error.tsx` instead of showing `<ServiceUnavailable/>` — the one
 * scenario that whole fallback exists for. It went unnoticed because a
 * stopped container (how this was tested by hand) produces the
 * `PrismaClientInitializationError` shape, which this always recognized.
 */
const SOCKET_UNREACHABLE_CODES = new Set([
    "ECONNREFUSED", // nothing listening on the port
    "ECONNRESET", // connection dropped mid-flight
    "ENOTFOUND", // host doesn't resolve
    "EHOSTUNREACH",
    "ETIMEDOUT",
    "EPIPE", // wrote to a socket the server already closed
]);

export function isDatabaseConnectionError(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientInitializationError) {
        return true;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return PRISMA_UNREACHABLE_CODES.has(error.code) || SOCKET_UNREACHABLE_CODES.has(error.code);
    }
    return false;
}

/**
 * Checked by name, not `error instanceof DatabaseUnavailableError` — found
 * the hard way (a live request, not a type check) that Next.js/Turbopack
 * compiles `@portfolio/backend` separately per execution context (Server
 * Components vs. Route Handlers are different bundles); an error thrown
 * as `DatabaseUnavailableError` in one context and caught with
 * `instanceof` from code in another silently evaluates to `false` — the
 * class in the catching bundle isn't recognized as the "same" class as
 * the one in the throwing bundle, even though it's the same source file.
 * `error.name` is a plain string on the instance, so it survives crossing
 * that boundary; this is the check every consumer in `web/` should use
 * instead of `instanceof` against this specific class.
 */
export function isDatabaseUnavailableError(error: unknown): boolean {
    return error instanceof Error && error.name === "DatabaseUnavailableError";
}

/**
 * Thrown by admin-posts.ts/admin-work.ts on a `slug` unique-constraint
 * violation (Prisma code `P2002`) — turned into a friendly 409 by the
 * `/api/admin/*` routes instead of a generic 500. Named by name, not
 * `instanceof`, for the exact same cross-bundle reason as
 * `isDatabaseUnavailableError` above.
 */
export class SlugAlreadyExistsError extends Error {
    constructor(slug: string) {
        super(`A record with slug "${ slug }" already exists.`);
        this.name = "SlugAlreadyExistsError";
    }
}

const UNIQUE_CONSTRAINT_CODE = "P2002";

export function isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_CODE;
}

export function isSlugAlreadyExistsError(error: unknown): boolean {
    return error instanceof Error && error.name === "SlugAlreadyExistsError";
}

/**
 * Checked structurally (`"issues" in error`), not `instanceof
 * z.ZodError` — same cross-bundle caution as the two checks above, kept
 * even though a Zod schema's own `.parse()` throwing and this check
 * running usually happen inside the same Route Handler bundle (no
 * Server-Component-vs-Route-Handler split like `DatabaseUnavailableError`
 * hit). `ZodError.issues` is Zod's own stable public field for this, not
 * an implementation detail this is guessing at.
 */
export function isValidationError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "issues" in error && Array.isArray((error as { issues: unknown }).issues);
}

interface ZodIssueLike {
    path: (string | number)[];
    message: string;
}

/** Human-readable one-liner for a `/api/admin/*` 400 response body — every admin route needs this, not just one, so it's formatted once here rather than in each route. */
export function formatValidationError(error: unknown): string {
    if (!isValidationError(error)) {
        return "Invalid input.";
    }
    const issues = (error as { issues: ZodIssueLike[] }).issues;
    return issues.map((issue) => `${ issue.path.join(".") || "(root)" }: ${ issue.message }`).join("; ");
}
