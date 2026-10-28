"use client";

import ReactMarkdown from "react-markdown";
import { SmartLinkBadge } from "@/shared/ui/smart-link";

/** Same marker as the backend's `SMART_LINK_TITLE` — a string, not an import, so this client module never pulls the backend package into the browser bundle. */
const SMART_LINK_TITLE = "smart";

export interface MarkdownProps {
    text: string;
}

/**
 * Renders a block's `text` field (bold/italic/links via standard Markdown
 * syntax — see the migration plan's content-model decision). Deliberately
 * does NOT add the `rehype-raw` plugin: without it, `react-markdown` never
 * interprets literal HTML tags in the source as markup — a `<script>` in
 * admin-authored text renders as the visible, harmless string `<script>`,
 * not executable HTML. This is the actual security boundary (see
 * ContentBlocks.test.tsx), not just a style choice.
 *
 * The default `p` renderer is overridden to drop its wrapping `<p>`: every
 * caller already renders its OWN block-level element (`<Text as="h2">`,
 * `<blockquote>`, ...) around a block's text, and `text` here is always a
 * single block's worth of prose, not a multi-paragraph document — nesting
 * `react-markdown`'s own `<p>` inside that would produce invalid/doubled
 * markup for the common case.
 *
 * `a` is overridden for smart links (added 2026-10-28, see
 * `shared/ui/smart-link/README.md`): a link written
 * `[label](url "smart")` renders as an inline badge when the page provided
 * a preview for `url`, and as a plain link otherwise. The `"smart"` marker
 * itself never reaches the DOM as a `title` tooltip. Every other link
 * renders exactly as before.
 */
export function Markdown({ text }: MarkdownProps) {
    return (
        <ReactMarkdown
            components={{
                p: ({ children }) => <>{children}</>,
                a: ({ href, title, children }) =>
                    title === SMART_LINK_TITLE && href
                        ? <SmartLinkBadge href={href}>{children}</SmartLinkBadge>
                        : <a href={href} title={title}>{children}</a>,
            }}
        >
            {text}
        </ReactMarkdown>
    );
}
