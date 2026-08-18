import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { Text } from "@/shared/ui/text";
import { LinkButton } from "@/shared/ui/button";

export interface RelatedContentCalloutProps {
    eyebrow: string;
    title: string;
    body: string;
    href: string;
    buttonLabel: string;
    className?: string;
}

/**
 * The "related post"/"related project" cross-link box — added 2026-08-11
 * (Work Item Covers & Unified Identity Hue) to deduplicate markup that
 * `JournalDetailPage` (linking to a related `Work`) and `WorkDetailPage`
 * (linking to a related `Post`) had each grown independently, byte-for-byte
 * identical except for the actual content/labels. Neither page renders
 * this on `Work`'s/`Post`'s own body content — only on the cross-link,
 * which is exactly why one component with `eyebrow`/`title`/`body`/`href`/
 * `buttonLabel` props (not a `kind: "post" | "work"` switch inside) is the
 * right shape: the CALLER already knows which kind of content it's
 * linking to and has already `pick()`'d the localized strings, this
 * component only ever needs to lay them out.
 */
export function RelatedContentCallout(
    {
        eyebrow,
        title,
        body,
        href,
        buttonLabel,
        className
    }: RelatedContentCalloutProps
) {
    return (
        <div
            className={ cn("bg-surface-base border border-border-subtle rounded-xl p-lg flex justify-between items-center gap-md flex-wrap", className) }>
            <div>
                <Eyebrow className="mb-xs">{ eyebrow }</Eyebrow>
                <Text as="div" variant="h3">
                    { title }
                </Text>
                <Text as="div" variant="caption" tone="muted">
                    { body }
                </Text>
            </div>
            <LinkButton href={ href } variant="primary">
                { buttonLabel } →
            </LinkButton>
        </div>
    );
}
