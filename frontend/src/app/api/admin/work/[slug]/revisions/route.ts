import { NextResponse } from "next/server";
import { listWorkRevisions } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

interface RouteParams {
    slug: string;
}

/** What `/admin/work/[slug]/history` renders — see `posts/[slug]/revisions/route.ts`'s comment; same reasoning, applied to Work. */
export const GET = defineAdminRoute<RouteParams>(async (_request, { params }) => {
    try {
        const { slug } = await params;
        const revisions = await listWorkRevisions(slug);
        if (!revisions) {
            return NextResponse.json({ error: "Work item not found." }, { status: 404 });
        }
        return NextResponse.json(revisions);
    } catch (error) {
        return toErrorResponse(error);
    }
});
