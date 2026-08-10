import { hasScopes, resolvePrincipalFromCookieStore } from "@/shared/lib/auth/principal";
import { ADMIN_SCOPE } from "@/shared/lib/auth/guard";

/**
 * Whether THIS request to a public detail route (`/journal/[slug]`,
 * `/work/[slug]`) should render the DRAFT-priority preview instead of the
 * published content — requires BOTH `?preview=1` in the URL AND a valid
 * admin session. A bare query param alone must never expose unpublished
 * content to an anonymous visitor: this is the one and only gate between
 * "an admin previewing their own draft" and "anyone who guesses the URL
 * parameter sees a work-in-progress post."
 *
 * Takes the raw `searchParams` shape Next.js hands a Server Component
 * (`string | string[] | undefined` per key) rather than a plain
 * `boolean`/`string` — callers pass `await searchParams` straight through
 * without having to know Next's own quirk that a repeated query key
 * becomes an array.
 */
export async function isAdminPreviewRequest(searchParams: Record<string, string | string[] | undefined>): Promise<boolean> {
    const requested = [searchParams.preview].flat().includes("1");
    if (!requested) {
        return false;
    }
    const principal = await resolvePrincipalFromCookieStore();
    return hasScopes(principal, ADMIN_SCOPE);
}
