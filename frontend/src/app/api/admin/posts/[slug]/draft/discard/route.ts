import { NextResponse } from "next/server";
import { discardPostDraft } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

interface RouteParams {
    slug: string;
}

/**
 * "Discard changes" — throws away whatever's pending in the post's
 * `ContentDraft`, reverting the editor's view back to the live,
 * currently-published content. No body, same reasoning as `.../publish`:
 * this discards what's ALREADY saved, it doesn't accept new content.
 */
export const POST = defineAdminRoute<RouteParams>(async (_request, { params }) => {
    try {
        const { slug } = await params;
        const post = await discardPostDraft(slug);
        if (!post) {
            return NextResponse.json({ error: "Post not found." }, { status: 404 });
        }
        return NextResponse.json(post);
    } catch (error) {
        return toErrorResponse(error);
    }
});
