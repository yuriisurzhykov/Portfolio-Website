import { NextResponse } from "next/server";
import { deletePost, getPostForAdmin, postDraftInputSchema, savePostDraft } from "@portfolio/backend";
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

/**
 * What autosave calls on every save after the very first one — see
 * `savePostDraft`'s own comment (admin-posts.ts): this ONLY ever writes a
 * `ContentDraft` row now, never the live `Post` — the fix for the bug
 * that motivated the whole draft/publish split (backend/src/content/README.md's
 * dated entry). The live post only ever changes via `POST .../publish`.
 */
export const PUT = defineAdminRoute<RouteParams>(async (request, { params }) => {
    try {
        const { slug } = await params;
        const body = await request.json();
        const input = postDraftInputSchema.parse(body);
        const updated = await savePostDraft(slug, input);
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
