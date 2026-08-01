import { NextResponse } from "next/server";
import { unpublishWork } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

interface RouteParams {
    slug: string;
}

/** `PUBLISHED → DRAFT` for a work item — see `posts/[slug]/unpublish/route.ts`'s comment; same reasoning, same 409 on an already-DRAFT item. */
export const POST = defineAdminRoute<RouteParams>(async (_request, { params }) => {
    try {
        const { slug } = await params;
        const unpublished = await unpublishWork(slug);
        if (!unpublished) {
            return NextResponse.json({ error: "Work item not found." }, { status: 404 });
        }
        return NextResponse.json(unpublished);
    } catch (error) {
        return toErrorResponse(error);
    }
});
