import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Regenerates the TTF subsets `src/media/fonts/` ships — same technique as
 * `frontend/scripts/fetch-og-fonts.mjs` (Google's legacy CSS endpoint, an
 * old User-Agent, to get a static TTF instead of a variable WOFF2), applied
 * to a different render target: librsvg (via `sharp`), not satori. Run by
 * hand, output committed.
 *
 * Two families, three weights, because the approved cover design (see the
 * `Generative Cover System v3` plan) uses Inter at two different weights
 * for two different layers (800 for the readable-title layer, 900 — Black —
 * for the letterform-fill layer, which needs to read as a solid block of
 * colour, not a title) plus JetBrains Mono for the technical stamp, matching
 * the monospace already used sitewide for code/stamp-style text.
 */

const CHARS = [
    ...range(0x20, 0x7e), // printable ASCII
    ...range(0x400, 0x45f), // Cyrillic
    ...[..."«»—–‘’“”·…№€°™©®"],
].join("");

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "media", "fonts");

const TARGETS = [
    { family: "Inter", weight: 800, file: "Inter-subset-800.ttf" },
    { family: "Inter", weight: 900, file: "Inter-subset-900.ttf" },
    { family: "JetBrains Mono", weight: 500, file: "JetBrainsMono-subset-500.ttf" },
];

function range(from, to) {
    return Array.from({ length: to - from + 1 }, (_, index) => String.fromCodePoint(from + index));
}

async function fetchSubset({ family, weight, file }) {
    const params = new URLSearchParams({ family: `${ family }:${ weight }`, text: CHARS });
    const cssResponse = await fetch(`https://fonts.googleapis.com/css?${ params }`, {
        // An ancient UA is what makes this endpoint answer with `truetype`
        // instead of woff2 — the whole reason this script exists.
        headers: { "User-Agent": "Mozilla/4.0" },
    });
    const css = await cssResponse.text();
    const url = css.match(/url\(([^)]+)\)/)?.[1];
    if (!url) {
        throw new Error(`No font URL in the CSS response for ${ family } ${ weight }:\n${ css }`);
    }

    const font = Buffer.from(await (await fetch(url)).arrayBuffer());
    const out = join(OUT_DIR, file);
    await writeFile(out, font);
    console.log(`${ out } — ${ font.byteLength } bytes`);
}

await mkdir(OUT_DIR, { recursive: true });
for (const target of TARGETS) {
    await fetchSubset(target);
}
