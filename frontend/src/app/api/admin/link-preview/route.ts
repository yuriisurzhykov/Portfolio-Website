import { NextResponse } from "next/server";
import { z } from "zod";
import { getLinkPreviews, refreshLinkPreviews } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

const requestSchema = z.object({
    url: z.string().min(1).max(2048),
    /** "Обновить" in the editor's popover — refetch even a fresh snapshot. */
    force: z.boolean().optional(),
    locale: z.enum(["en", "ru"]).optional(),
});

/**
 * The editor's live preview: called when a URL is pasted (debounced) and by
 * the "Refresh" button. Fetches the snapshot if needed — this, and the save
 * routes, are the only places the server ever fetches another site, and
 * all of them are admin-only (see backend/src/link-preview/README.md).
 * Responds with the preview INCLUDING its last error, so the popover can say
 * why a link has no card. `{ preview: null }` = nothing to preview (not an
 * http(s) URL, or an own page that doesn't exist / isn't published).
 *
 * Admin mutations are already rate-limited per IP by `proxy.ts`.
 */
export const POST = defineAdminRoute(async (request) => {
    try {
        const { url, force, locale } = requestSchema.parse(await request.json());
        await refreshLinkPreviews([url], { force });
        const previews = await getLinkPreviews([url], locale ?? "en", { includeErrors: true });
        return NextResponse.json({ preview: previews[url] ?? null });
    } catch (error) {
        return toErrorResponse(error);
    }
});
