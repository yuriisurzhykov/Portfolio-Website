import { NextResponse, type NextRequest } from "next/server";
import { deleteWork, getWorkBySlug, updateWork, workInputSchema } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";

interface RouteParams {
    params: Promise<{ slug: string }>;
}

/**
 * Reuses the public `getWorkBySlug` directly — no separate
 * `getWorkForAdmin` exists; see admin-work.ts's top-of-file comment for
 * why `Work` doesn't need the admin-only read function `Post` does.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
    try {
        const { slug } = await params;
        const item = await getWorkBySlug(slug);
        if (!item) {
            return NextResponse.json({ error: "Work item not found." }, { status: 404 });
        }
        return NextResponse.json(item);
    } catch (error) {
        return toErrorResponse(error);
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { slug } = await params;
        const body = await request.json();
        const input = workInputSchema.parse(body);
        const updated = await updateWork(slug, input);
        if (!updated) {
            return NextResponse.json({ error: "Work item not found." }, { status: 404 });
        }
        return NextResponse.json(updated);
    } catch (error) {
        return toErrorResponse(error);
    }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    try {
        const { slug } = await params;
        const deleted = await deleteWork(slug);
        if (!deleted) {
            return NextResponse.json({ error: "Work item not found." }, { status: 404 });
        }
        return NextResponse.json({ ok: true });
    } catch (error) {
        return toErrorResponse(error);
    }
}
