import type { NextRequest } from "next/server";

/**
 * Best-effort client IP, shared by every place that needs one for rate
 * limiting (`proxy.ts`, `/api/auth/login`, `/api/auth/refresh`) — one
 * implementation instead of each call site independently parsing headers
 * slightly differently.
 *
 * Prefers `X-Real-IP`: nginx (`.scripts/provision/10-nginx-site.sh`) sets it
 * to `$remote_addr`, i.e. OVERWRITES whatever a client sent, so it can't be
 * spoofed by a request arriving through nginx. `X-Forwarded-For` is set via
 * `$proxy_add_x_forwarded_for`, which APPENDS to whatever the client already
 * sent in that header instead of replacing it — a client that sends its own
 * `X-Forwarded-For: 1.2.3.4` arrives at this app as `1.2.3.4, <real ip>`,
 * and naively reading the FIRST entry (the old behavior here) reads back
 * the attacker-supplied value, defeating every per-IP rate limit for free.
 * `X-Forwarded-For`'s first entry is kept only as a fallback for local dev
 * and tests, where there is no nginx in front to set `X-Real-IP` at all.
 */
export function getClientIp(request: NextRequest): string {
    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) {
        return realIp;
    }
    const forwardedFor = request.headers.get("x-forwarded-for");
    return forwardedFor?.split(",")[0]?.trim() || "local-dev";
}
