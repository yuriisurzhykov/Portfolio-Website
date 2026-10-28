export interface PageMetadata {
    title: string | null;
    description: string | null;
    siteName: string | null;
    /** Absolute — already resolved against the page's final URL. */
    imageUrl: string | null;
    faviconUrl: string | null;
}

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 400;
const MAX_SITE_NAME = 100;

const NAMED_ENTITIES: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " ",
    mdash: "—",
    ndash: "–",
    hellip: "…",
    laquo: "«",
    raquo: "»",
    rsquo: "’",
    lsquo: "‘",
    rdquo: "”",
    ldquo: "“",
    middot: "·",
    copy: "©",
};

/** Enough of HTML's entity decoding for `<title>`/`content="…"` text: numeric references plus the named ones real `<head>`s actually use. An unknown name stays as written. */
export function decodeEntities(text: string): string {
    return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, ref: string) => {
        if (ref[0] === "#") {
            const code = ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
            return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
        }
        return NAMED_ENTITIES[ref.toLowerCase()] ?? whole;
    });
}

function clean(value: string | undefined, max: number): string | null {
    if (value === undefined) {
        return null;
    }
    const text = decodeEntities(value).replace(/\s+/g, " ").trim();
    if (text === "") {
        return null;
    }
    return text.length > max ? `${ text.slice(0, max - 1).trimEnd() }…` : text;
}

/** `name="x" content='y' async` → `{name: "x", content: "y", async: ""}`, names lowercased. */
function parseAttributes(source: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    const pattern = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g;
    for (const match of source.matchAll(pattern)) {
        attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    }
    return attributes;
}

function absolute(value: string | undefined, baseUrl: string): string | null {
    if (!value) {
        return null;
    }
    try {
        const url = new URL(decodeEntities(value.trim()), baseUrl);
        return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
    } catch {
        return null;
    }
}

/** Larger declared icon first (`sizes="192x192"` beats `"16x16"`), `apple-touch-icon` treated as a big one — a 16 px icon upscaled to 64 looks blurry. */
function iconScore(rel: string, sizes: string | undefined): number {
    const declared = Math.max(0, ...(sizes ?? "").split(/\s+/).map((size) => parseInt(size, 10) || 0));
    if (declared > 0) {
        return declared;
    }
    return rel.includes("apple-touch-icon") ? 180 : 32;
}

/**
 * HTML → the handful of fields a preview card shows. A small tag scanner
 * over the document's `<head>`, not a full HTML parser: `<meta>`,
 * `<link>` and `<title>` are all this needs, and a regex over `<head>` is
 * enough for them without adding a parser dependency to the backend.
 * Everything coming out of here is still untrusted text — the renderer
 * treats it as plain React text, never as HTML.
 *
 * Precedence follows what sites actually maintain best: OpenGraph, then
 * Twitter cards, then the plain `<title>`/`<meta name="description">`.
 * A site with no icon in its markup falls back to `/favicon.ico`, which
 * most still serve.
 */
export function extractMetadata(html: string, pageUrl: string): PageMetadata {
    const headEnd = html.search(/<\/head\s*>/i);
    const head = headEnd === -1 ? html : html.slice(0, headEnd);

    const meta: Record<string, string> = {};
    let bestIcon: { href: string; score: number } | null = null;

    for (const match of head.matchAll(/<(meta|link)\b([^>]*)>/gi)) {
        const attributes = parseAttributes(match[2]);
        if (match[1].toLowerCase() === "meta") {
            const key = (attributes.property ?? attributes.name ?? "").toLowerCase();
            if (key && attributes.content !== undefined && !(key in meta)) {
                meta[key] = attributes.content;
            }
            continue;
        }
        const rel = (attributes.rel ?? "").toLowerCase();
        // SVG icons are skipped on purpose: `link-images.ts` never rasterizes
        // untrusted SVG (librsvg follows external references), so picking
        // one would just mean no icon at all.
        const isSvg = /svg/i.test(attributes.type ?? "") || /\.svg(\?|#|$)/i.test(attributes.href ?? "");
        if (attributes.href && !isSvg && /(^|\s)(icon|apple-touch-icon)(\s|$)/.test(rel) && !rel.includes("mask-icon")) {
            const score = iconScore(rel, attributes.sizes);
            if (!bestIcon || score > bestIcon.score) {
                bestIcon = { href: attributes.href, score };
            }
        }
    }

    const titleTag = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(head)?.[1];

    return {
        title: clean(meta["og:title"] ?? meta["twitter:title"] ?? titleTag, MAX_TITLE),
        description: clean(meta["og:description"] ?? meta["twitter:description"] ?? meta.description, MAX_DESCRIPTION),
        siteName: clean(meta["og:site_name"] ?? meta["application-name"], MAX_SITE_NAME),
        imageUrl: absolute(meta["og:image:secure_url"] ?? meta["og:image"] ?? meta["twitter:image"] ?? meta["twitter:image:src"], pageUrl),
        faviconUrl: absolute(bestIcon?.href ?? "/favicon.ico", pageUrl),
    };
}

/** `text/html; charset=windows-1251` or `<meta charset="…">` → a decoder; UTF-8 when neither says otherwise or the label is unknown. */
export function decodeHtml(body: Buffer, contentType: string | null): string {
    const fromHeader = /charset=["']?([\w-]+)/i.exec(contentType ?? "")?.[1];
    const fromMeta = /<meta[^>]+charset=["']?([\w-]+)/i.exec(body.subarray(0, 4096).toString("latin1"))?.[1];
    const label = fromHeader ?? fromMeta ?? "utf-8";
    try {
        return new TextDecoder(label).decode(body);
    } catch {
        return new TextDecoder("utf-8").decode(body);
    }
}
