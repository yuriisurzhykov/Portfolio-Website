import { NextResponse } from "next/server";
import { publishPost } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

interface RouteParams {
    slug: string;
}

/**
 * `DRAFT → PUBLISHED` — no request body at all (see `publishPost`'s
 * comment in `admin-posts.ts`): this route only ever validates and flips
 * the state of whatever is ALREADY saved, it's not a place to sneak in
 * content changes. A missing required field (e.g. an empty excerpt) comes
 * back as a normal 400 via `toErrorResponse`'s existing `ZodError`
 * handling — no new error-handling branch needed, `publishPost` throws
 * the exact same error shape `createPost`/`updatePost` already do.
 */
export const POST = defineAdminRoute<RouteParams>(async (_request, { params }) => {
    try {
        const { slug } = await params;
        const published = await publishPost(slug);
        if (!published) {
            return NextResponse.json({ error: "Post not found." }, { status: 404 });
        }
        return NextResponse.json(published);
    } catch (error) {
        return toErrorResponse(error);
    }
});
