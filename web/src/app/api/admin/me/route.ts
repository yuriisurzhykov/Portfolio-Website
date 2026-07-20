import { NextResponse, type NextRequest } from "next/server";

/**
 * First real protected route — exists so the /admin/* + /api/admin/*
 * guard in src/proxy.ts has something genuine to protect end-to-end, ahead
 * of the actual admin UI (Phase 4). Reads identity from the headers
 * `proxy.ts` already attached after verifying the access token, instead of
 * verifying the JWT a second time here — the proxy is the single place
 * that checks the token; every downstream route trusts its output.
 */
export async function GET(request: NextRequest) {
    return NextResponse.json({
        id: request.headers.get("x-user-id"),
        email: request.headers.get("x-user-email"),
        role: request.headers.get("x-user-role"),
    });
}
