import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Tag } from "@/shared/ui/tag";
import type { TagSize, TagVariant } from "@/shared/ui/tag/Tag.types";

export interface TagListProps {
    items: string[];
    /** Show at most this many `Tag`s, replacing the rest with a single "+N" indicator. Omit entirely to show every item — the case-study detail page's full-list state. */
    maxVisible?: number;
    variant?: TagVariant;
    size?: TagSize;
    className?: string;
}

/**
 * One shared way to render a list of plain-text tags (a Work item's tech
 * stack, today) in two states — full (`maxVisible` omitted, the
 * `/work/:slug` case-study page) and collapsed (`maxVisible` set, a
 * card/ledger row where a long stack would otherwise wrap awkwardly).
 * Added 2026-08-11 (Work Item Covers & Unified Identity Hue) to replace
 * THREE different ad-hoc renderings of the exact same `Work.stack` data:
 * a real `<Tag>` list on `/work/:slug`, a plain `·`-joined text row on the
 * landing "Selected Work" card, and another plain `·`-joined text row
 * (differently truncated) on the `/work` ledger.
 *
 * The "+N" indicator is deliberately NOT clickable — every real caller
 * already sits inside (or right next to) a link to the item's own detail
 * page, where the full list renders anyway. A separate expand affordance
 * would also risk nesting an interactive element inside the row's own
 * `<Link>`, which `WorkListPage`'s ledger row already is — invalid HTML
 * (a focusable control inside an anchor).
 */
export function TagList({ items, maxVisible, variant = "neutral", size = "sm", className }: TagListProps) {
    const visible = maxVisible !== undefined ? items.slice(0, maxVisible) : items;
    const hidden = items.slice(visible.length);

    return (
        <div className={cn("flex flex-wrap items-center gap-xs", className)}>
            {visible.map((item) => (
                <Tag key={item} variant={variant} size={size}>
                    {item}
                </Tag>
            ))}
            {hidden.length > 0 && (
                <Tag variant="outline" size={size} title={hidden.join(", ")}>
                    +{hidden.length}
                </Tag>
            )}
        </div>
    );
}
