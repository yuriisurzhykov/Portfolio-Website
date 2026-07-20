import { NextResponse, type NextRequest } from "next/server";
import { createPost, getJournalEntries, postInputSchema } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";

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
export async function GET() {
    try {
        const entries = await getJournalEntries();
        return NextResponse.json(entries);
    } catch (error) {
        return toErrorResponse(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const input = postInputSchema.parse(body);
        const created = await createPost(input);
        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        return toErrorResponse(error);
    }
}
