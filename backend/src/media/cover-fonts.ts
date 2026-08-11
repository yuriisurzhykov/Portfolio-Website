import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * The three embedded TTF subsets `scripts/fetch-cover-fonts.mjs` fetches —
 * Inter Black (900, the letterform-fill layer), Inter ExtraBold (800, the
 * readable-title layer), and JetBrains Mono (500, the technical stamp).
 * Confirmed live (Day-0 gate, see the `Generative Cover System v3` plan):
 * all three embed and rasterize correctly through `sharp`/librsvg,
 * including Cyrillic.
 */
export interface CoverFonts {
    interBlack: Buffer;
    interExtraBold: Buffer;
    jetBrainsMono: Buffer;
}

/**
 * Same `__dirname`-inside-a-bundled-Next.js-server problem as
 * `media-store.ts`'s `resolveMediaRootDir()` — see that function's own
 * comment for the full story (found live there, not assumed). Applying the
 * identical fix here rather than rediscovering it: `frontend/next.config.ts`
 * sets `COVER_FONTS_DIR` explicitly, for the exact same reason it already
 * sets `MEDIA_DIR`.
 */
export function resolveCoverFontsDir(): string {
    return process.env.COVER_FONTS_DIR ?? path.resolve(__dirname, "fonts");
}

let cached: Promise<CoverFonts> | undefined;

async function readCoverFonts(): Promise<CoverFonts> {
    const dir = resolveCoverFontsDir();
    const [interBlack, interExtraBold, jetBrainsMono] = await Promise.all([
        fs.readFile(path.join(dir, "Inter-subset-900.ttf")),
        fs.readFile(path.join(dir, "Inter-subset-800.ttf")),
        fs.readFile(path.join(dir, "JetBrainsMono-subset-500.ttf")),
    ]);
    return { interBlack, interExtraBold, jetBrainsMono };
}

/** Read once per process, not per request — same reasoning as `frontend/src/shared/lib/seo/og/fonts.ts`'s `ogFonts()`: a cover render that re-read three files from disk every time would pay for it under exactly the traffic (a post publish/regenerate) this exists to serve. */
export function coverFonts(): Promise<CoverFonts> {
    cached ??= readCoverFonts();
    return cached;
}

/** Test-only escape hatch, same reasoning as `setMediaStoreForTesting`. */
export function setCoverFontsForTesting(fonts: Promise<CoverFonts> | undefined): void {
    cached = fonts;
}
