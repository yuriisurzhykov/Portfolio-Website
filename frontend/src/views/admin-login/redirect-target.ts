import { isSafeRelativePath } from "@/shared/lib/safe-relative-path";
import { LOGIN_PATH } from "@/shared/lib/auth/constants";

/** Where an admin lands after signing in with no particular destination in mind. */
export const DEFAULT_ADMIN_LANDING = "/admin/journal";

/**
 * Resolves the `?from=` query parameter into a destination to navigate to
 * after a successful sign-in, or the default landing page.
 *
 * Three rejections, each for its own reason:
 *
 * - **Not a safe relative path** — `?from=` is attacker-supplied by
 *   construction (anyone can send a link), so `//evil.example` must not
 *   become a redirect off-site. Uses the same `isSafeRelativePath` the
 *   status pages already use for their own `from`.
 * - **Not under `/admin`** — this page only ever exists to get someone
 *   into the admin area; bouncing them to an arbitrary public page after
 *   sign-in would be surprising.
 * - **The login page itself** — the one that was actually broken. A
 *   `from` pointing back at `/admin/login` meant a SUCCESSFUL sign-in
 *   navigated straight back to the sign-in form, which is
 *   indistinguishable from "it didn't work". Real URLs looked like
 *   `/admin/login?from=%2Fadmin%2Flogin%3Ffrom%3D%252Fadmin...` — see
 *   `admin-api.ts`'s `redirectToLogin` for where that nesting came from.
 */
export function resolveRedirectTarget(from: string | null | undefined): string {
    if (!isSafeRelativePath(from) || !from.startsWith("/admin") || from.startsWith(LOGIN_PATH)) {
        return DEFAULT_ADMIN_LANDING;
    }
    return from;
}
