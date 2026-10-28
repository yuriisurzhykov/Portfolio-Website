import type { Block, BlockInput } from "../content/blocks";

/**
 * The Markdown link title that turns an ordinary link into an inline
 * smart-link badge: `[label](https://… "smart")`. Plain CommonMark, so
 * `react-markdown` parses it with no plugin and old renderers still show a
 * normal link (see the design doc's "Модель контента").
 */
export const SMART_LINK_TITLE = "smart";

/**
 * Linear on any input, which CodeQL's ReDoS check flagged the first version
 * for: neither the label nor the URL may contain `[`, so a scan that starts
 * at one `[` can never run past the next one (a page of `[[[[…` or
 * `[](![](!…` no longer costs O(n²)), and both are length-capped. Nothing
 * real is lost — the editor percent-encodes `(`/`)` in a smart link's URL
 * (`convert.ts`), and a raw `(` could never match here anyway, since `)`
 * ends the destination.
 */
const SMART_LINK = /\[(?:\\.|[^[\]\\]){0,500}\]\(\s*<?([^\s()<>[\]]{1,2048})>?\s+"smart"\s*\)/g;

/** Every URL a Markdown text marks as a smart link, in order, duplicates included. */
export function smartLinkUrlsInMarkdown(markdown: string): string[] {
    return [...markdown.matchAll(SMART_LINK)].map((match) => match[1]);
}

function textOf(block: Block | BlockInput): string | null | undefined {
    return "text" in block ? block.text : undefined;
}

function collectInto(blocks: readonly (Block | BlockInput)[], into: Set<string>): void {
    for (const block of blocks) {
        if (block.type === "linkCard") {
            into.add(block.data.url);
        }
        if (block.type === "list") {
            for (const item of block.data.items) {
                smartLinkUrlsInMarkdown(item.text).forEach((url) => into.add(url));
                collectInto(item.blocks, into);
            }
            continue;
        }
        const text = textOf(block);
        if (text) {
            smartLinkUrlsInMarkdown(text).forEach((url) => into.add(url));
        }
    }
}

/**
 * Every URL in a document that needs a preview — `linkCard` blocks plus
 * `"smart"` links inside any block's text, including blocks nested under
 * list items. Deduplicated, in first-seen order. This is what both the
 * admin save path (what to refresh) and the public page (what to look up)
 * work from, so the two can never disagree about which links count.
 */
export function collectLinkUrls(blocks: readonly (Block | BlockInput)[]): string[] {
    const urls = new Set<string>();
    collectInto(blocks, urls);
    return [...urls];
}

export type InternalTarget = { kind: "work" | "post"; slug: string };

const INTERNAL_PATH = /^\/(?:ru\/)?(work|journal)\/([a-z0-9][a-z0-9-]*)\/?$/;

/**
 * `/work/:slug`, `/journal/:slug` (and their `/ru/` versions), or the same
 * paths on this site's own `SITE_URL` origin → which `Work`/`Post` they
 * mean. Those are resolved from the database instead of fetched, so they
 * are always current and cost no network.
 */
export function parseInternalTarget(url: string, siteUrl: string | undefined = process.env.SITE_URL): InternalTarget | null {
    let path = url;
    if (!url.startsWith("/")) {
        if (!siteUrl) {
            return null;
        }
        try {
            const parsed = new URL(url);
            if (parsed.origin !== new URL(siteUrl).origin) {
                return null;
            }
            path = parsed.pathname;
        } catch {
            return null;
        }
    }
    const match = INTERNAL_PATH.exec(path.split(/[?#]/)[0]);
    if (!match) {
        return null;
    }
    return { kind: match[1] === "work" ? "work" : "post", slug: match[2] };
}
