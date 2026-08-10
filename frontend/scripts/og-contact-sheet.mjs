import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Downloads every Open Graph card the site can render and writes an
 * index.html contact sheet showing them side by side.
 *
 * Run against a RUNNING server (`npm run start`, or `npm run dev`):
 *
 *   node scripts/og-contact-sheet.mjs http://127.0.0.1:3000 .og-cards
 *
 * The URL set is derived from `/sitemap.xml` rather than hardcoded, so it
 * stays correct as content changes — and because the sitemap already
 * applies the `hasBody`/`hasCaseStudy` filters, every entry here
 * corresponds to a page that really exists.
 *
 * Note what is NOT per-page: `/`, `/journal` and `/work` have no card of
 * their own and inherit the site-wide default at `/opengraph-image`.
 */
const [origin = "http://127.0.0.1:3000", outDir = ".og-cards"] = process.argv.slice(2);

const sitemap = await (await fetch(`${ origin }/sitemap.xml`)).text();
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => new URL(match[1]).pathname)
    .filter((path) => /^\/(journal|work)\/[^/]+$/.test(path));

const cards = [
    { label: "site default (used by /, /journal, /work)", path: "/opengraph-image" },
    ...paths.flatMap((path) => [
        { label: `${ path } — en`, path: `${ path }/og-image/en` },
        { label: `${ path } — ru`, path: `${ path }/og-image/ru` },
    ]),
];

await mkdir(outDir, { recursive: true });

const sections = [];
for (const card of cards) {
    const response = await fetch(`${ origin }${ card.path }`);
    const file = `${ card.path.replaceAll("/", "_").replace(/^_/, "") }.png`;
    await writeFile(join(outDir, file), Buffer.from(await response.arrayBuffer()));
    console.log(`${ response.status }  ${ card.path }`);
    sections.push(
        `<figure><figcaption>${ card.label }<br><code>${ card.path }</code></figcaption><img src="${ file }" width="600"></figure>`,
    );
}

await writeFile(
    join(outDir, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>OG cards</title>
<style>body{background:#0b0b0d;color:#f5f3f0;font:14px system-ui;padding:24px}
figure{margin:0 0 28px}figcaption{margin-bottom:8px;color:#b3b0ab}code{color:#e8743a}
img{border:1px solid rgba(255,255,255,.15);display:block}</style>
${ sections.join("\n") }`,
);

console.log(`\n${ cards.length } card(s) -> ${ join(outDir, "index.html") }`);
