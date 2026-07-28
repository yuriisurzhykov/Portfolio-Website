import { NextResponse } from "next/server";
import { deletePost, getPostForAdmin, postInputSchema, updatePost } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

interface RouteParams {
    slug: string;
}

/** Full editable shape (scalars + blocks) — what the admin edit page's Server Component calls directly; see posts/route.ts's GET comment on why the web UI doesn't loop back through its own HTTP API for reads. */
export const GET = defineAdminRoute<RouteParams>(async (_request, { params }) => {
    try {
        const { slug } = await params;
        const post = await getPostForAdmin(slug);
        if (!post) {
            return NextResponse.json({ error: "Post not found." }, { status: 404 });
        }
        return NextResponse.json(post);
    } catch (error) {
        return toErrorResponse(error);
    }
});

export const PUT = defineAdminRoute<RouteParams>(async (request, { params }) => {
    try {
        const { slug } = await params;
        const body = await request.json();
        const input = postInputSchema.parse(body);
        const updated = await updatePost(slug, input);
        if (!updated) {
            return NextResponse.json({ error: "Post not found." }, { status: 404 });
        }
        return NextResponse.json(updated);
    } catch (error) {
        return toErrorResponse(error);
    }
});

export const DELETE = defineAdminRoute<RouteParams>(async (_request, { params }) => {
    try {
        const { slug } = await params;
        const deleted = await deletePost(slug);
        if (!deleted) {
            return NextResponse.json({ error: "Post not found." }, { status: 404 });
        }
        return NextResponse.json({ ok: true });
    } catch (error) {
        return toErrorResponse(error);
    }
});
