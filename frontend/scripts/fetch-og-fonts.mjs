import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Regenerates the two TTF subsets `shared/lib/seo/og/fonts/` ships.
 *
 * Run by hand, not by the build — the output is committed. satori (behind
 * `next/og`) reads TTF/OTF/WOFF only, never WOFF2, and cannot use variable
 * fonts, so neither Google's modern CSS API nor a `@fontsource` package can
 * be consumed directly. This script asks Google's legacy CSS endpoint for a
 * static instance subset to exactly the character set below — the reason
 * each file is ~50 KB rather than the ~600 KB a full Noto Sans would be.
 *
 * The character set is Latin + the Cyrillic block + the punctuation the
 * site's own copy actually uses. A character outside it renders as a
 * missing glyph ("tofu") in OG images and nowhere else — which is what
 * `tests/e2e/og-image.spec.ts` exists to catch.
 */

const CHARS = [
    ...range(0x20, 0x7e), // printable ASCII
    ...range(0x400, 0x45f), // Cyrillic
    ...[..."«»—–‘’“”·…№€°™©®"],
].join("");

const WEIGHTS = [400, 700];
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "shared", "lib", "seo", "og", "fonts");

function range(from, to) {
    return Array.from({ length: to - from + 1 }, (_, index) => String.fromCodePoint(from + index));
}

async function fetchSubset(weight) {
    const params = new URLSearchParams({ family: `Noto Sans:${ weight }`, text: CHARS });
    const cssResponse = await fetch(`https://fonts.googleapis.com/css?${ params }`, {
        // An ancient UA is what makes this endpoint answer with `truetype`
        // instead of woff2 — the whole reason this script exists.
        headers: { "User-Agent": "Mozilla/4.0" },
    });
    const css = await cssResponse.text();
    const url = css.match(/url\(([^)]+)\)/)?.[1];
    if (!url) {
        throw new Error(`No font URL in the CSS response for weight ${ weight }:\n${ css }`);
    }

    const font = Buffer.from(await (await fetch(url)).arrayBuffer());
    const file = join(OUT_DIR, `NotoSans-subset-${ weight }.ttf`);
    await writeFile(file, font);
    console.log(`${ file } — ${ font.byteLength } bytes`);
}

await mkdir(OUT_DIR, { recursive: true });
for (const weight of WEIGHTS) {
    await fetchSubset(weight);
}
