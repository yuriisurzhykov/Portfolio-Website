import { NextResponse } from "next/server";
import { coverUrlFor, regenerateCoverForPost } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

interface RouteParams {
    slug: string;
}

/**
 * Generates a new cover CANDIDATE for `slug` — does NOT make it live; `PUT
 * .../cover` (this same folder's sibling route) is the separate "accept
 * this one" step. See `backend/src/media/README.md`'s "Роуты" entry.
 *
 * The response is ALWAYS job-shaped (`{ state, ... }`), even though
 * generation is synchronous today (the procedural generator never awaits
 * anything real) — Phase 3's AI generator is genuinely asynchronous
 * (network calls, provider timeouts), and this shape is what lets that
 * phase add a `{ state: "QUEUED", jobId }` branch plus client-side polling
 * WITHOUT changing this route's contract or its caller. Not a speculative
 * abstraction: the shape costs nothing today and the second branch is a
 * documented, planned near-term need, not a guess.
 */
export const POST = defineAdminRoute<RouteParams>(async (_request, { params }) => {
    try {
        const { slug } = await params;
        const asset = await regenerateCoverForPost(slug);
        if (!asset) {
            return NextResponse.json({ error: "Post not found." }, { status: 404 });
        }
        return NextResponse.json({
            state: "SUCCEEDED",
            asset: { id: asset.id, ...coverUrlFor(asset) },
        });
    } catch (error) {
        return toErrorResponse(error);
    }
});
