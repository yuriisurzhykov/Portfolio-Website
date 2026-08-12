import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { resolveMediaRootDir } from "@portfolio/backend";

/**
 * Serves generated media (today: post covers, `covers/<hash>-<width>.webp`
 * — see `backend/src/media/`) straight off disk. In PRODUCTION this route
 * is never actually reached: nginx's own `location /media/` (see
 * `.scripts/provision/10-nginx-site.sh`) serves the exact same directory
 * directly, faster, without Node in the loop at all — this route exists
 * for local dev (no nginx in front of `next dev`) and as a portable
 * fallback for any deploy target that hasn't provisioned that nginx block
 * yet. Both sides read the SAME directory via `resolveMediaRootDir()`
 * (`backend/src/media/media-store.ts`) rather than each hardcoding a path
 * that could silently drift apart.
 *
 * Excluded from `proxy.ts`'s locale/rate-limit handling by construction —
 * its matcher skips any path containing a `.` (a file extension), and
 * every real key here ends in one (see `frontend/src/proxy.ts`'s own
 * comment on that pattern).
 */
const CONTENT_TYPES: Record<string, string> = {
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
};

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
    const { path: segments } = await params;

    // Defense in depth, not a first line of defense — every real URL this
    // app ever generates comes from `coverUrlFor` (a content-addressed,
    // server-built key), never from arbitrary user input, but this is the
    // boundary where a hostile path segment WOULD have to be rejected if
    // that ever stopped being true.
    if (segments.some((segment) => segment === "..")) {
        return new NextResponse(null, { status: 400 });
    }

    const filePath = path.join(resolveMediaRootDir(), ...segments);

    let bytes: Buffer;
    try {
        bytes = await fs.readFile(filePath);
    } catch {
        return new NextResponse(null, { status: 404 });
    }

    const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(bytes), {
        headers: {
            "Content-Type": contentType,
            // Safe by construction: every filename here is content-addressed
            // (a sha256 hash — see MediaAsset.contentHash), so this exact URL
            // can never later resolve to different bytes.
            "Cache-Control": "public, max-age=31536000, immutable",
        },
    });
}
