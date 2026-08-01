import { NextResponse } from "next/server";
import { createWork, getWorkForAdmin, workDraftInputSchema } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

/**
 * See posts/route.ts's GET comment — same reasoning, and the same 2026-07-31 fix,
 * apply here: `getWorkForAdmin()`, not the public `getAllWork()` (PUBLISHED-only).
 * */
export const GET = defineAdminRoute(async () => {
    try {
        const items = await getWorkForAdmin();
        return NextResponse.json(items);
    } catch (error) {
        return toErrorResponse(error);
    }
});

export const POST = defineAdminRoute(async (request) => {
    try {
        const body = await request.json();
        const input = workDraftInputSchema.parse(body);
        const created = await createWork(input);
        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        return toErrorResponse(error);
    }
});
