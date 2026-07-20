import { NextResponse, type NextRequest } from "next/server";
import { getPostTranslationForAdmin, translatePost, translatePostInputSchema } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";

interface RouteParams {
    params: Promise<{ slug: string }>;
}

/**
 * Separate from `/api/admin/posts/[slug]` on purpose (see the migration
 * plan's "Перевод — отдельный API, не часть основного PostInput") — this
 * route only ever reads/writes the Russian side of a post, never the
 * English content or scalar fields (`date`/`status`/`relatedWorkSlug`/...).
 * GET is what `/admin/journal/[slug]/translate`'s Server Component calls
 * directly (see posts/route.ts's GET comment on why the web UI doesn't
 * loop back through its own HTTP API for reads); this route exists so the
 * full JSON contract exists too.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
    try {
        const { slug } = await params;
        const translation = await getPostTranslationForAdmin(slug);
        if (!translation) {
            return NextResponse.json({ error: "Post not found." }, { status: 404 });
        }
        return NextResponse.json(translation);
    } catch (error) {
        return toErrorResponse(error);
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { slug } = await params;
        const body = await request.json();
        const input = translatePostInputSchema.parse(body);
        const updated = await translatePost(slug, input);
        if (!updated) {
            return NextResponse.json({ error: "Post not found." }, { status: 404 });
        }
        return NextResponse.json(updated);
    } catch (error) {
        return toErrorResponse(error);
    }
}
