import { NextResponse, type NextRequest } from "next/server";
import { hasScopes, resolvePrincipal, resolvePrincipalFromCookieStore, type Principal } from "./principal";
import { REQUEST_PATHNAME_HEADER } from "./constants";

/**
 * The one scope this app actually issues today (see `principal.ts`'s
 * `scopesForRole`) — exported so every admin route/page declares its
 * requirement through this constant rather than typing the literal string
 * `"admin:*"` in a dozen files (and risking a typo `defineRoute` can't
 * catch, since it only compares strings).
 */
export const ADMIN_SCOPE = ["admin:*"];

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
 * every `route.ts` export in `web/src/app/api/**` is wrapped in this (via
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
        return handler(request, context ?? { params: Promise.resolve({} as TParams) }, principal);
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
