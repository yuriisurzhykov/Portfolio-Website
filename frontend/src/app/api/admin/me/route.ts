import { NextResponse } from "next/server";
import { defineAdminRoute } from "@/shared/lib/auth/guard";

/**
 * First real protected route — exists so there's something genuine to
 * exercise `defineAdminRoute` end-to-end. Reads identity from `principal`
 * (verified fresh by `defineAdminRoute` itself, via `resolvePrincipal`)
 * instead of trusting headers `proxy.ts` used to attach — `proxy.ts`
 * doesn't verify tokens anymore at all, see its top comment.
 */
export const GET = defineAdminRoute(async (_request, _context, principal) => {
    return NextResponse.json({
        id: principal.userId,
        email: principal.email,
        scopes: principal.scopes,
    });
});
