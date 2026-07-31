import { NextResponse } from "next/server";
import { deleteWork, getWorkDetailForAdmin, updateWork, workDraftInputSchema } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

interface RouteParams {
    slug: string;
}

/**
 * Calls `getWorkDetailForAdmin`, not the public `getWorkBySlug` — see
 * admin-work.ts's top-of-file comment. That used to be a direct reuse of
 * the public function (Work never needed a separate admin read, unlike
 * Post) — no longer true since the content lifecycle state machine
 * (2026-07-31): the public function now filters `lifecycleState:
 * "PUBLISHED"`, so it would 404 the admin edit screen for any DRAFT item.
 */
export const GET = defineAdminRoute<RouteParams>(async (_request, { params }) => {
    try {
        const { slug } = await params;
        const item = await getWorkDetailForAdmin(slug);
        if (!item) {
            return NextResponse.json({ error: "Work item not found." }, { status: 404 });
        }
        return NextResponse.json(item);
    } catch (error) {
        return toErrorResponse(error);
    }
});

export const PUT = defineAdminRoute<RouteParams>(async (request, { params }) => {
    try {
        const { slug } = await params;
        const body = await request.json();
        const input = workDraftInputSchema.parse(body);
        const updated = await updateWork(slug, input);
        if (!updated) {
            return NextResponse.json({ error: "Work item not found." }, { status: 404 });
        }
        return NextResponse.json(updated);
    } catch (error) {
        return toErrorResponse(error);
    }
});

export const DELETE = defineAdminRoute<RouteParams>(async (_request, { params }) => {
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
});
