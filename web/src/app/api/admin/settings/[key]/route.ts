import { NextResponse, type NextRequest } from "next/server";
import { getSiteContent, isSiteContentKey, updateSiteContent } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";

interface RouteParams {
    params: Promise<{ key: string }>;
}

/**
 * No `[key]/route.ts` DELETE, unlike `/api/admin/work/[slug]` — a
 * `SiteContentKey` is one of a fixed set of 7 sections declared in
 * `content/site-content.ts`, not a user-created record; "delete a
 * section" isn't a real admin action (there's no equivalent of removing
 * `hero` from the site), only "edit its contents."
 */

/** 404 for a syntactically-valid-but-unknown `key` (e.g. `/api/admin/settings/nonsense`) — same shape as a missing slug elsewhere, not a 400 (the URL itself is well-formed). */
export async function GET(_request: NextRequest, { params }: RouteParams) {
    try {
        const { key } = await params;
        if (!isSiteContentKey(key)) {
            return NextResponse.json({ error: "Unknown settings section." }, { status: 404 });
        }
        const data = await getSiteContent(key);
        return NextResponse.json(data);
    } catch (error) {
        return toErrorResponse(error);
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { key } = await params;
        if (!isSiteContentKey(key)) {
            return NextResponse.json({ error: "Unknown settings section." }, { status: 404 });
        }
        const body = await request.json();
        // `updateSiteContent` validates `body` against the per-key Zod
        // schema itself (see its comment) — no separate `*InputSchema`
        // per section the way `postInputSchema`/`workInputSchema` exist,
        // because these sections have no admin-vs-public shape split
        // (`ru: ""` convention, etc.) to enforce at the input boundary;
        // the read shape and the write shape are the same shape.
        const updated = await updateSiteContent(key, body);
        return NextResponse.json(updated);
    } catch (error) {
        return toErrorResponse(error);
    }
}
