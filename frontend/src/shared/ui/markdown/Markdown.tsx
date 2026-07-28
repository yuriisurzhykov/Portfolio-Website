"use client";

import ReactMarkdown from "react-markdown";

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
 */
export function Markdown({ text }: MarkdownProps) {
    return (
        <ReactMarkdown
            components={{
                p: ({ children }) => <>{children}</>,
            }}
        >
            {text}
        </ReactMarkdown>
    );
}
