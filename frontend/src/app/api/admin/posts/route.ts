import { NextResponse } from "next/server";
import { createPost, getJournalEntries, postDraftInputSchema } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

/**
 * GET here is what a future mobile client (or a script) would call to
 * list posts — the web admin UI's own `/admin/journal` list page does NOT
 * call this over HTTP; it's a Server Component that calls
 * `getJournalEntries()` directly (same as the public `/journal` page),
 * one process, no loopback network hop for something already running
 * server-side. This route exists so the full JSON contract exists and is
 * reusable, per the migration plan's Phase 4 goal — not because the web UI
 * itself needs to fetch its own API for a plain read.
 */
export const GET = defineAdminRoute(async () => {
    try {
        const entries = await getJournalEntries();
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
