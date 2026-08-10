import { NextResponse } from "next/server";
import { getWorkTranslationForAdmin, translateWork, translateWorkInputSchema } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

interface RouteParams {
    slug: string;
}

/** See posts/[slug]/translation/route.ts's top comment — same separation, same reasoning (including the draft/publish note), applied to `Work`. */
export const GET = defineAdminRoute<RouteParams>(async (_request, { params }) => {
    try {
        const { slug } = await params;
        const translation = await getWorkTranslationForAdmin(slug);
        if (!translation) {
            return NextResponse.json({ error: "Work item not found." }, { status: 404 });
        }
        return NextResponse.json(translation);
    } catch (error) {
        return toErrorResponse(error);
    }
});

export const PUT = defineAdminRoute<RouteParams>(async (request, { params }) => {
    try {
        const { slug } = await params;
        const body = await request.json();
        const input = translateWorkInputSchema.parse(body);
        const updated = await translateWork(slug, input);
        if (!updated) {
            return NextResponse.json({ error: "Work item not found." }, { status: 404 });
        }
        return NextResponse.json(updated);
    } catch (error) {
        return toErrorResponse(error);
    }
});
