import { NextResponse } from "next/server";
import { restoreWorkRevision } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

interface RouteParams {
    slug: string;
    revisionId: string;
}

/** "Load into draft" for a work item — see `posts/[slug]/revisions/[revisionId]/restore/route.ts`'s comment; same reasoning. */
export const POST = defineAdminRoute<RouteParams>(async (_request, { params }) => {
    try {
        const { slug, revisionId } = await params;
        const item = await restoreWorkRevision(slug, revisionId);
        if (!item) {
            return NextResponse.json({ error: "Work item or revision not found." }, { status: 404 });
        }
        return NextResponse.json(item);
    } catch (error) {
        return toErrorResponse(error);
    }
});
