import { NextResponse } from "next/server";
import { restorePostRevision } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

interface RouteParams {
    slug: string;
    revisionId: string;
}

/**
 * "Load into draft" — copies a past PUBLISHED revision's content into the
 * post's current draft. Deliberately does NOT publish anything itself —
 * the restored content still goes through the normal Publish/Update
 * button afterward, same as any other edit (see `restorePostRevision`'s
 * comment, admin-posts.ts). No body — the revision to restore is already
 * fully identified by the URL.
 */
export const POST = defineAdminRoute<RouteParams>(async (_request, { params }) => {
    try {
        const { slug, revisionId } = await params;
        const post = await restorePostRevision(slug, revisionId);
        if (!post) {
            return NextResponse.json({ error: "Post or revision not found." }, { status: 404 });
        }
        return NextResponse.json(post);
    } catch (error) {
        return toErrorResponse(error);
    }
});
