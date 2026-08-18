import { NextResponse } from "next/server";
import { z } from "zod";
import { clearPostCover, setPostCover } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

interface RouteParams {
    slug: string;
}

const acceptCoverSchema = z.object({ assetId: z.string().min(1) });

/** Accepts a previously generated candidate (`POST .../cover/generate`'s response) as `slug`'s live cover. */
export const PUT = defineAdminRoute<RouteParams>(async (request, { params }) => {
    try {
        const { slug } = await params;
        const { assetId } = acceptCoverSchema.parse(await request.json());
        const ok = await setPostCover(slug, assetId);
        if (!ok) {
            return NextResponse.json({ error: "Post or cover asset not found." }, { status: 404 });
        }
        return NextResponse.json({ ok: true });
    } catch (error) {
        return toErrorResponse(error);
    }
});

/** Clears `slug`'s cover — leaves it without one until the next accepted regeneration; every public renderer already handles `cover: null` gracefully (see `PostSummary.cover`'s own comment). */
export const DELETE = defineAdminRoute<RouteParams>(async (_request, { params }) => {
    try {
        const { slug } = await params;
        const ok = await clearPostCover(slug);
        if (!ok) {
            return NextResponse.json({ error: "Post not found." }, { status: 404 });
        }
        return NextResponse.json({ ok: true });
    } catch (error) {
        return toErrorResponse(error);
    }
});
