import { NextResponse } from "next/server";
import { createPost, getPostsForAdmin, postDraftInputSchema } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

/**
 * GET is for a future mobile client/script — the admin UI's own list page
 * calls `getPostsForAdmin()` directly instead. Uses `getPostsForAdmin()`,
 * not the public `getJournalEntries()` (PUBLISHED-only) — a real review
 * comment caught this route quietly hiding drafts from an admin client.
 */
export const GET = defineAdminRoute(async () => {
    try {
        const entries = await getPostsForAdmin();
        return NextResponse.json(entries);
    } catch (error) {
        return toErrorResponse(error);
    }
});

export const POST = defineAdminRoute(async (request) => {
    try {
        const body = await request.json();
        const input = postDraftInputSchema.parse(body);
        const created = await createPost(input);
        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        return toErrorResponse(error);
    }
});
