"use client";

import * as React from "react";
import type { LinkPreviewMap, LinkPreviewView } from "@portfolio/backend";

const LinkPreviewContext = React.createContext<LinkPreviewMap>({});

/**
 * Makes a document's link previews (fetched server-side by the page, see
 * `getLinkPreviewsForBlocks`) visible to every `Markdown` inside it — a
 * `"smart"` link can sit in any block's text, several levels down inside a
 * list item, and threading a prop through `renderBlock` for that would touch
 * every block case.
 */
export function LinkPreviewProvider({ previews, children }: { previews: LinkPreviewMap; children: React.ReactNode }) {
    return <LinkPreviewContext.Provider value={ previews }>{ children }</LinkPreviewContext.Provider>;
}

/** `undefined` = no preview for this URL (none fetched yet, or nothing usable) — the caller renders a plain link. */
export function useLinkPreview(url: string | undefined): LinkPreviewView | undefined {
    const previews = React.useContext(LinkPreviewContext);
    return url ? previews[url] : undefined;
}
