import { NextResponse } from "next/server";
import { publishWork } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

interface RouteParams {
    slug: string;
}

/** `DRAFT → PUBLISHED`, or "apply the pending draft" for an already-published item — see `posts/[slug]/publish/route.ts`'s comment; same reasoning, no body, same error handling. */
export const POST = defineAdminRoute<RouteParams>(async (_request, { params }) => {
    try {
        const { slug } = await params;
        const published = await publishWork(slug);
        if (!published) {
            return NextResponse.json({ error: "Work item not found." }, { status: 404 });
        }
        return NextResponse.json(published);
    } catch (error) {
        return toErrorResponse(error);
    }
});
