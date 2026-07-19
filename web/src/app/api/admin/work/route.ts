import { NextResponse, type NextRequest } from "next/server";
import { createWork, getAllWork, workInputSchema } from "@portfolio/backend";
import { toErrorResponse } from "@/shared/lib/api-error-response";

/** See posts/route.ts's GET comment — same reasoning applies here. */
export async function GET() {
    try {
        const items = await getAllWork();
        return NextResponse.json(items);
    } catch (error) {
        return toErrorResponse(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const input = workInputSchema.parse(body);
        const created = await createWork(input);
        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        return toErrorResponse(error);
    }
}
