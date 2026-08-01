import { NextResponse } from "next/server";
import { unpublishPost } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

interface RouteParams {
    slug: string;
}

/**
 * `PUBLISHED → DRAFT` — see `posts/[slug]/publish/route.ts`'s comment for
 * why this takes no body. `unpublishPost` throws
 * `InvalidLifecycleTransitionError` for an already-DRAFT post —
 * `toErrorResponse` (see its own update, `api-error-response.ts`) turns
 * that into a 409, the same status a slug conflict already uses for "the
 * request is understood but conflicts with the resource's current state."
 */
export const POST = defineAdminRoute<RouteParams>(async (_request, { params }) => {
    try {
        const { slug } = await params;
        const unpublished = await unpublishPost(slug);
        if (!unpublished) {
            return NextResponse.json({ error: "Post not found." }, { status: 404 });
        }
        return NextResponse.json(unpublished);
    } catch (error) {
        return toErrorResponse(error);
    }
});
