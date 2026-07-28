import { NextResponse } from "next/server";
import { createWork, getAllWork, workInputSchema } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

/** See posts/route.ts's GET comment — same reasoning applies here. */
export const GET = defineAdminRoute(async () => {
    try {
        const items = await getAllWork();
        return NextResponse.json(items);
    } catch (error) {
        return toErrorResponse(error);
    }
});

export const POST = defineAdminRoute(async (request) => {
    try {
        const body = await request.json();
        const input = workInputSchema.parse(body);
        const created = await createWork(input);
        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        return toErrorResponse(error);
    }
});
