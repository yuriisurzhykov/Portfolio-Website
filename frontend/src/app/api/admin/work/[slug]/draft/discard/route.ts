import { NextResponse } from "next/server";
import { discardWorkDraft } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

interface RouteParams {
    slug: string;
}

/** "Discard changes" for a work item — see `posts/[slug]/draft/discard/route.ts`'s comment; same reasoning. */
export const POST = defineAdminRoute<RouteParams>(async (_request, { params }) => {
    try {
        const { slug } = await params;
        const item = await discardWorkDraft(slug);
        if (!item) {
            return NextResponse.json({ error: "Work item not found." }, { status: 404 });
        }
        return NextResponse.json(item);
    } catch (error) {
        return toErrorResponse(error);
    }
});
