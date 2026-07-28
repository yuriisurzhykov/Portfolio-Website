import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@portfolio/backend/edge";
import { ACCESS_TOKEN_COOKIE } from "@/shared/lib/auth-constants";

/**
 * What every route/page guard checks against. `scopes`, not a single
 * `role` string — today `scopesForRole` only ever produces `["admin:*"]`
 * (there is exactly one role), but a route/page already declares what it
 * needs as a list of scope strings (see `guard.ts`), so a future narrower
 * role (e.g. a translator who can only call `posts:translate`) is a change
 * to this one mapping function, not to every call site that already
 * declared its requirement.
 */
export interface Principal {
    userId: string;
    email: string;
    scopes: string[];
}

/** Single place role→scopes is decided — see `Principal`'s doc comment above for why this indirection exists even with one role today. */
function scopesForRole(role: string): string[] {
    return role === "admin" ? ["admin:*"] : [];
}

async function resolvePrincipalFromToken(token: string | undefined): Promise<Principal | null> {
    if (!token) {
        return null;
    }
    const payload = await verifyAccessToken(token);
    if (!payload) {
        return null;
    }
    return { userId: payload.sub, email: payload.email, scopes: scopesForRole(payload.role) };
}

/**
 * For Route Handlers / `proxy.ts`, which receive a real `NextRequest`.
 * Accepts either the httpOnly cookie (what the browser-based admin UI
 * sends automatically) or a `Bearer` header (a future mobile client/script)
 * — same two sources `proxy.ts` used to check before this module existed.
 */
export async function resolvePrincipal(request: NextRequest): Promise<Principal | null> {
    const bearerHeader = request.headers.get("authorization");
    const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
        ?? bearerHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    return resolvePrincipalFromToken(token);
}

/**
 * For Server Component pages, which never see a `NextRequest` — only
 * `next/headers`'s `cookies()`. Kept as a separate function (not an
 * overload on `resolvePrincipal`) because the two runtimes hand identity
 * to application code through genuinely different APIs; both funnel into
 * the same `resolvePrincipalFromToken` so there is exactly one place that
 * turns a raw token into a `Principal`.
 */
export async function resolvePrincipalFromCookieStore(): Promise<Principal | null> {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    return resolvePrincipalFromToken(store.get(ACCESS_TOKEN_COOKIE)?.value);
}

/**
 * `required.length === 0` means "public" — allowed regardless of
 * `principal` (including `null`, i.e. no session at all). Otherwise every
 * required scope must be covered by something the principal holds, either
 * an exact match or a `"prefix:*"` wildcard they hold that covers it —
 * today that's always `"admin:*"` covering everything, but the wildcard
 * check is written generally so a future `"posts:*"` (covers
 * `"posts:write"`, `"posts:publish"`, ...) works the same way without
 * changing this function again.
 */
export function hasScopes(principal: Principal | null, required: string[]): boolean {
    if (required.length === 0) {
        return true;
    }
    if (!principal) {
        return false;
    }
    return required.every((need) =>
        principal.scopes.some((have) => have === need || (have.endsWith(":*") && need.startsWith(have.slice(0, -1)))),
    );
}
