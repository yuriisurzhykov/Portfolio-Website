import { NextResponse } from "next/server";
import { z } from "zod";
import { techIconSchema } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";
import { resolveTechIcon, searchBrandIcons } from "@/shared/lib/tech-icons";

/**
 * Admin-only window into the Simple Icons catalog (~3450 icons) — the
 * browser never gets the whole thing (see `shared/lib/tech-icons/
 * registry.ts`'s top comment for why), only the handful of results a
 * query actually matches, or the already-resolved icons for the rows
 * currently on screen. One resource ("what icon should this tech-stack
 * row show"), two verbs:
 *
 * - `GET ?q=<query>` — live search results for the quick-add bar and the
 *   per-row "Brand" picker (`{ slug, title, path }[]`, already includes
 *   `path` so the admin UI can preview a result before committing to it
 *   — see `search-brand-icons.ts`'s own comment on why that's not a
 *   second round-trip).
 * - `POST { items: [{ name, icon }] }` — resolves a whole list at once,
 *   reusing `resolveTechIcon` itself (the SAME function the public
 *   landing page calls) rather than duplicating the guess-a-slug-then-
 *   look-it-up logic here, so the admin's previews can never drift from
 *   what actually ships publicly.
 */
export const GET = defineAdminRoute(async (request) => {
    try {
        return NextResponse.json(searchBrandIcons(request.nextUrl.searchParams.get("q") ?? ""));
    } catch (error) {
        return toErrorResponse(error);
    }
});

/**
 * `POST` for a read — the tech-stack editor needs "what will each of
 * these N rows actually render", which is one question about a whole
 * list, and a list of `{ name, icon }` pairs (an `icon` can carry a
 * multi-KB pasted `<svg>`) doesn't fit a query string. The alternative,
 * one `GET` per row, would mean 20+ round-trips every time an admin
 * pastes a stack list. Nothing is written here — `defineAdminRoute`'s
 * CSRF check and audit log still apply, which is a fine price for a
 * route only the admin UI can reach anyway.
 *
 * `.max(200)`: a rough sanity bound, not a product limit — a real tech
 * stack is tens of rows, and this stops a malformed/hostile body from
 * turning one request into 100k catalog lookups.
 */
const resolveRequestSchema = z.object({
    items: z.array(z.object({ name: z.string(), icon: techIconSchema })).max(200),
});

export const POST = defineAdminRoute(async (request) => {
    try {
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
        }
        const { items } = resolveRequestSchema.parse(body);
        return NextResponse.json({ views: items.map(resolveTechIcon) });
    } catch (error) {
        return toErrorResponse(error);
    }
});
