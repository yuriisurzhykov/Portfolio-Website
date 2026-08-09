import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * satori — the engine behind `next/og` — reads TTF, OTF and WOFF, but NOT
 * WOFF2, and does not support variable fonts. It also has no system fonts
 * of any kind: whatever the caller does not hand it simply cannot be
 * drawn. That is why the two files next to this one are committed static
 * TTF subsets rather than a `next/font` import (this project doesn't use
 * `next/font` at all) or a runtime download.
 *
 * Read from `process.cwd()`, as Next.js's own documentation prescribes —
 * the deploy artifact contains the whole `frontend/` directory, so the
 * path resolves on the VPS as well as locally.
 *
 * Both subsets cover Latin AND Cyrillic (see `scripts/fetch-og-fonts.mjs`).
 * A broken subset is invisible in a component-level test — a browser would
 * silently fall back to a system font and draw Russian correctly — which is
 * why `tests/e2e/og-image.spec.ts` screenshots the real route output
 * instead.
 */
const FONT_DIR = join(process.cwd(), "src", "shared", "lib", "seo", "og", "fonts");

export interface OgFont {
    name: string;
    data: Buffer;
    weight: 400 | 700;
    style: "normal";
}

/** Read once per process, not per request — an OG route that re-read two files on every crawl would pay for it under exactly the traffic it exists to serve. */
let cached: Promise<OgFont[]> | null = null;

export function ogFonts(): Promise<OgFont[]> {
    cached ??= Promise.all([
        readFile(join(FONT_DIR, "NotoSans-subset-400.ttf")),
        readFile(join(FONT_DIR, "NotoSans-subset-700.ttf")),
    ]).then(([regular, bold]): OgFont[] => [
        { name: "Noto Sans", data: regular, weight: 400, style: "normal" },
        { name: "Noto Sans", data: bold, weight: 700, style: "normal" },
    ]);

    return cached;
}
