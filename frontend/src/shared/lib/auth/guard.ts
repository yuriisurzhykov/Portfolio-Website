import { NextResponse, type NextRequest } from "next/server";
import { logAuditEvent } from "@portfolio/backend";
import { hasScopes, resolvePrincipal, resolvePrincipalFromCookieStore, type Principal } from "./principal";
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE, REQUEST_PATHNAME_HEADER } from "./constants";

/**
 * The one scope this app actually issues today (see `principal.ts`'s
 * `scopesForRole`) — exported so every admin route/page declares its
 * requirement through this constant rather than typing the literal string
 * `"admin:*"` in a dozen files (and risking a typo `defineRoute` can't
 * catch, since it only compares strings).
 */
export const ADMIN_SCOPE = ["admin:*"];

/**
 * `GET`/`HEAD` never mutate anything, so there's nothing for CSRF to
 * exploit there — restricting the header check to the methods that
 * actually write data keeps every existing `GET` call (`admin-api.ts`
 * doesn't even use this guard for reads today, but `defineAdminRoute`
 * itself is also used directly by a couple of GET routes) working
 * unchanged.
 */
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * See `constants.ts`'s own comment on `CSRF_HEADER_NAME`/`_VALUE` for the
 * full threat-model reasoning. Checks the exact VALUE, not just presence —
 * presence-only would still block a plain `<form>` post (forms can't set
 * ANY custom header, value or not), but pinning the value too costs
 * nothing and rules out a hypothetical future where some other legitimate
 * client sends the header name with a different value for its own reasons.
 */
function hasRequiredCsrfHeader(request: NextRequest): boolean {
    return request.headers.get(CSRF_HEADER_NAME) === CSRF_HEADER_VALUE;
}

interface RouteContext<TParams> {
    params: Promise<TParams>;
}

type AdminRouteHandler<TParams> = (
    request: NextRequest,
    context: RouteContext<TParams>,
    principal: Principal,
) => Promise<Response> | Response;

type PublicRouteHandler<TParams> = (
    request: NextRequest,
    context: RouteContext<TParams>,
) => Promise<Response> | Response;

/**
 * The ONLY place a Route Handler's authorization requirement is decided —
 * every `route.ts` export in `frontend/src/app/api/**` is wrapped in this (via
 * `defineAdminRoute`/`definePublicRoute` below) instead of trusting
 * whatever `proxy.ts` may or may not have already checked. `proxy.ts` no
 * longer makes this decision at all (see its own top comment) — it can't,
 * by construction: middleware runs before Next.js even resolves which
 * `route.ts` will handle the request, so the only vocabulary it has is the
 * URL's shape, not the specific handler's own declared requirement. This
 * function is what actually reads that declaration and enforces it, in
 * exactly one place, reused by every route.
 *
 * `resolvePrincipal` re-verifies the JWT here (a second verification vs.
 * whatever `proxy.ts` might have done) — deliberately not "trust a header
 * proxy.ts already set," so this guard is correct even if a route is ever
 * reached by some path that didn't go through `proxy.ts` (a future
 * internal call, a test hitting the handler directly, a `matcher` typo)
 * — the route defends itself rather than trusting an upstream layer's
 * bookkeeping.
 */
function defineRoute<TParams>(
    requiredScopes: string[],
    handler: (request: NextRequest, context: RouteContext<TParams>, principal: Principal | null) => Promise<Response> | Response,
) {
    return async (request: NextRequest, context?: RouteContext<TParams>): Promise<Response> => {
        const principal = await resolvePrincipal(request);
        if (!hasScopes(principal, requiredScopes)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // Scoped to routes that actually require a non-empty scope (i.e.
        // defineAdminRoute, never definePublicRoute) — login/logout/refresh
        // are deliberately public and own their own security boundary (see
        // definePublicRoute's own comment), not this one. 403, not 401: the
        // principal check above already passed, so this is "authenticated
        // but rejected for a different reason," the conventional meaning of
        // 403 vs. 401's "not authenticated at all."
        if (requiredScopes.length > 0 && MUTATING_METHODS.has(request.method) && !hasRequiredCsrfHeader(request)) {
            return NextResponse.json({ error: "Missing or invalid CSRF header." }, { status: 403 });
        }
        const response = await handler(request, context ?? { params: Promise.resolve({} as TParams) }, principal);
        // Every admin write, logged in exactly one place — the same reason
        // the CSRF check above lives here rather than duplicated in each of
        // the 12 `/api/admin/**` route files: a future admin route
        // automatically gets audit coverage for free, with no chance of one
        // handler forgetting to call it. `principal` is guaranteed non-null
        // here (the earlier `hasScopes` check already returned 401 for a
        // null principal against a non-empty requirement).
        if (requiredScopes.length > 0 && MUTATING_METHODS.has(request.method)) {
            const authenticated = principal as Principal;
            logAuditEvent("admin_mutation", {
                userId: authenticated.userId,
                email: authenticated.email,
                method: request.method,
                path: request.nextUrl.pathname,
                status: response.status,
            });
        }
        return response;
    };
}

/** The common case — almost every `/api/admin/**` route. `principal` is typed non-null here: `hasScopes` already returned `false` for a `null` principal against a non-empty requirement, so reaching `handler` guarantees one exists. */
export function defineAdminRoute<TParams = Record<string, string>>(handler: AdminRouteHandler<TParams>) {
    return defineRoute<TParams>(ADMIN_SCOPE, (request, context, principal) => handler(request, context, principal as Principal));
}

/** `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout` — none of these can require a valid access token (that's the exact thing they exist to obtain or replace), so each is public at THIS layer; each one's own logic is its real security boundary (password check, refresh-token hash lookup, ...). */
export function definePublicRoute<TParams = Record<string, string>>(handler: PublicRouteHandler<TParams>) {
    return defineRoute<TParams>([], (request, context) => handler(request, context));
}

/**
 * The page-level equivalent of `defineAdminRoute`, for Server Components
 * (`app/admin/**\/page.tsx`) — same `resolvePrincipal`-backed check, just a
 * `redirect()` instead of a JSON 401 (a page has no "body" to fail with,
 * and a redirect is the correct UX response to "you're not signed in,"
 * matching the login page's `?from=` handling in
 * `views/admin-login/AdminLoginPage.tsx`).
 */
export async function requirePage(requiredScopes: string[] = ADMIN_SCOPE): Promise<Principal> {
    const principal = await resolvePrincipalFromCookieStore();
    if (!hasScopes(principal, requiredScopes)) {
        const { redirect } = await import("next/navigation");
        const { headers } = await import("next/headers");
        const pathname = (await headers()).get(REQUEST_PATHNAME_HEADER) ?? "/admin/journal";
        redirect(`/admin/login?from=${ encodeURIComponent(pathname) }`);
    }
    return principal as Principal;
}
