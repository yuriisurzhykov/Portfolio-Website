"use client";

import * as React from "react";
import { createReactInlineContentSpec } from "@blocknote/react";
import { Link2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { SiteIcon, displayDomainOf } from "@/shared/ui/smart-link";
import { useEditorLinkPreview } from "../link-preview-client";

/**
 * The inline smart-link badge inside the editor — what the site stores as
 * `[label](url "smart")` (see `convert.ts`'s smart-link section for that
 * mapping). An atom (`content: "none"`): the chip is one unit the cursor
 * steps over and Backspace deletes whole, like a mention, so a half-edited
 * badge can't exist.
 *
 * Shows the same icon + title the public badge will, fetched through the
 * admin preview endpoint. Not a real `<a>` — a click inside the editor must
 * never navigate away from an unsaved draft. The "↩" button turns it back
 * into an ordinary link for the times a pasted URL should stay plain text.
 */
export const SmartLinkInline = createReactInlineContentSpec(
    {
        type: "smartLink",
        propSchema: {
            url: { default: "" },
            label: { default: "" },
        },
        content: "none",
    },
    {
        render: ({ inlineContent, editor, getPos }) => {
            const { url, label } = inlineContent.props;
            const { preview, loading } = useEditorLinkPreview(url);
            const title = preview?.title ?? (label || displayDomainOf(url));

            const toPlainLink = () => {
                const position = getPos();
                if (position === undefined) {
                    return;
                }
                editor.transact((tr) => {
                    const linkMark = tr.doc.type.schema.marks.link.create({ href: url });
                    tr.replaceWith(position, position + 1, tr.doc.type.schema.text(label || url, [linkMark]));
                });
            };

            return (
                <span
                    data-smart-link={ url }
                    title={ url }
                    className={ cn(
                        "inline-flex items-center gap-1.5 align-baseline mx-0.5 py-px pl-1 pr-1 rounded-sm border",
                        "border-border-default bg-surface-raised font-medium text-text-primary leading-normal",
                        loading && "opacity-70",
                    ) }
                >
                    { preview ? <SiteIcon preview={ preview } size="sm"/> : <Link2 size={ 14 } aria-hidden="true" className="text-text-muted"/> }
                    <span>{ title }</span>
                    <button
                        type="button"
                        onClick={ toPlainLink }
                        aria-label="Convert to a plain link"
                        title="Convert to a plain link"
                        className="rounded-xs px-xxs text-micro text-text-muted hover:text-text-primary"
                    >
                        ↩
                    </button>
                </span>
            );
        },
        /** Copy/drag out of the editor gives a normal link to the page — the `"smart"` marker is this site's own storage detail (`convert.ts`), not something to leak into another app. */
        toExternalHTML: ({ inlineContent }) => <a href={ inlineContent.props.url }>{ inlineContent.props.label || inlineContent.props.url }</a>,
    },
);
