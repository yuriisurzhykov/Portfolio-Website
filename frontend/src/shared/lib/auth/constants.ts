/**
 * Set by `proxy.ts` on every `/admin*` request, read by `requirePage()`
 * (`guard.ts`) to build the `?from=` redirect target. Next.js gives Server
 * Components no built-in way to read the current request's pathname — this
 * is the standard workaround (middleware stamps it onto a header, the
 * Server Component reads it back via `next/headers`). Not an authorization
 * signal — purely a UX convenience for "come back here after signing in."
 */
export const REQUEST_PATHNAME_HEADER = "x-pathname";
