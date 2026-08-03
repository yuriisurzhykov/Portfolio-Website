import { type NextRequest, NextResponse } from "next/server";
import { definePublicRoute } from "@/shared/lib/auth/guard";

// Not a secret at build time — just the container's own address (see
// docker-compose.yml's "plantuml" service / backend/.env.example). No
// PLANTUML_SERVER_URL set at all in an environment is treated as "point at
// the local dev container" so a fresh clone + docker compose up still works.
const PLANTUML_SERVER_URL = process.env.PLANTUML_SERVER_URL ?? "http://127.0.0.1:8081";

// PlantUML's deflate+base64 encoding rarely exceeds a few thousand
// characters for a realistic diagram — this only guards against something
// wildly malformed reaching the upstream fetch.
const MAX_ENCODED_LENGTH = 20_000;

interface RouteParams {
    encoded: string;
}

/**
 * Public, not admin-gated — a PUBLISHED post's PlantUML diagram has to
 * render for every visitor, not just signed-in admins (see guard.ts's
 * `definePublicRoute` doc comment for why this decision lives only here).
 * Proxies to the self-hosted plantuml-server rather than letting the
 * browser call it directly, so PLANTUML_SERVER_URL (an internal,
 * 127.0.0.1-only address in dev) never needs to be reachable from outside
 * this server — the browser never talks to it directly, same shape as the
 * database never being reachable from the browser.
 *
 * `Cache-Control: immutable` is safe here specifically because `encoded` IS
 * the content hash (plantuml-encoder's deflate+base64 of the exact source
 * text) — a different diagram source always produces a different URL, so
 * this can never serve stale content for an edited diagram under the SAME
 * URL.
 */
export const GET = definePublicRoute<RouteParams>(async (_request: NextRequest, {params}) => {
    const {encoded} = await params;

    if (!encoded || encoded.length > MAX_ENCODED_LENGTH) {
        return NextResponse.json({ error: "Invalid diagram reference." }, { status: 400 });
    }

    let upstream: Response;
    try {
        upstream = await fetch(`${ PLANTUML_SERVER_URL }/svg/${ encoded }`);
    } catch {
        return NextResponse.json(
            {error: "Diagram service temporarily unavailable. Please try again shortly."},
            {status: 503, headers: {"Retry-After": "30"}},
        )
    }

    if (!upstream.ok) {
        return NextResponse.json(
            {error: "Diagram service temporarily unavailable. Please try again shortly."},
            {status: 503, headers: {"Retry-After": "30"}},
        );
    }
    const svg = await upstream.text();
    return new NextResponse(svg, {
        status: 200,
        headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=31536000, immutable",
        },
    });
});