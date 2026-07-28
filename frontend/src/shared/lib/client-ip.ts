import type { NextRequest } from "next/server";

/**
 * Best-effort client IP, shared by every place that needs one for rate
 * limiting (`proxy.ts`, `/api/auth/login`, `/api/auth/refresh`) — one
 * implementation instead of each call site independently parsing
 * `x-forwarded-for` slightly differently. Trusts the header because nginx
 * sits in front of this app in production (see `frontend/README.md`'s
 * deployment notes) and is the one process allowed to set it; falls back
 * to a constant key locally, where there is no proxy setting it at all.
 */
export function getClientIp(request: NextRequest): string {
    const forwardedFor = request.headers.get("x-forwarded-for");
    return forwardedFor?.split(",")[0]?.trim() || "local-dev";
}
