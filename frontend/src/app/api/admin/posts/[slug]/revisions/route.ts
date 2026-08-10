import { NextResponse } from "next/server";
import { listPostRevisions } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

interface RouteParams {
    slug: string;
}

/** What `/admin/journal/[slug]/history` renders — every past PUBLISHED snapshot of this post, newest first. See `listPostRevisions` (admin-posts.ts) for the pruning/retention rules. */
export const GET = defineAdminRoute<RouteParams>(async (_request, { params }) => {
    try {
        const { slug } = await params;
        const revisions = await listPostRevisions(slug);
        if (!revisions) {
            return NextResponse.json({ error: "Post not found." }, { status: 404 });
        }
        return NextResponse.json(revisions);
    } catch (error) {
        return toErrorResponse(error);
    }
});
