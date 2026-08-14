/**
 * Set by `proxy.ts` on every `/admin*` request, read by `requirePage()`
 * (`guard.ts`) to build the `?from=` redirect target. Next.js gives Server
 * Components no built-in way to read the current request's pathname — this
 * is the standard workaround (middleware stamps it onto a header, the
 * Server Component reads it back via `next/headers`). Not an authorization
 * signal — purely a UX convenience for "come back here after signing in."
 */
export const REQUEST_PATHNAME_HEADER = "x-pathname";

/**
 * CSRF defense-in-depth for mutating `/api/admin/**` requests (`guard.ts`'s
 * `defineAdminRoute`) — added during the OWASP audit remediation.
 * `SameSite=Strict` cookies (`auth-cookies.ts`) already stop a cross-site
 * request from carrying the access-token cookie at all, so this is a
 * SECOND, independent layer, not the only one: a plain HTML `<form>` (the
 * classic CSRF delivery mechanism) cannot set an arbitrary request header,
 * and a cross-ORIGIN `fetch()`/XHR that tries to would trigger a CORS
 * preflight this app never answers with an `Access-Control-Allow-Origin`
 * (verified — no CORS headers exist anywhere in this codebase), so the
 * browser blocks the real request from ever reaching the server with
 * credentials attached. The exact value matters, not just presence — see
 * `hasRequiredCsrfHeader`'s own comment.
 */
export const CSRF_HEADER_NAME = "x-requested-with";
export const CSRF_HEADER_VALUE = "portfolio-admin-ui";

/**
 * Where the sign-in page lives — declared once because two independent
 * guards need to recognise it, and both exist to break the same loop:
 * `admin-api.ts`'s `redirectToLogin` must not send the visitor to sign in
 * when they are ALREADY signing in, and `resolveRedirectTarget`
 * (`views/admin-login`) must not accept it as a "return to" destination
 * after a successful sign-in.
 */
export const LOGIN_PATH = "/admin/login";
