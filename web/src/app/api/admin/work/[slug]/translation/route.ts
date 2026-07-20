import { NextResponse, type NextRequest } from "next/server";
import { getWorkTranslationForAdmin, translateWork, translateWorkInputSchema } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";

interface RouteParams {
    params: Promise<{ slug: string }>;
}

/** See posts/[slug]/translation/route.ts's top comment — same separation, same reasoning, applied to `Work`. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
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
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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
}
