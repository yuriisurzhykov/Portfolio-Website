"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { cn } from "@/shared/lib/utils";

export interface AdminListItemProps {
    /** Status/"Featured" pills — top-left. A post only ever has one (published/upcoming); a work item can have two (shipped/in-progress + Featured) — hence a slot, not a single `status` prop. */
    badges: React.ReactNode;
    /** Short, single-line meta — top-right, opposite the badges. A formatted date for a post, the year for a work item. */
    meta: React.ReactNode;
    title: string;
    /** Optional — the slug row is only rendered when this is non-empty, so a future "actually, drop the slug" decision is a one-line call-site change, not a component edit. */
    slug?: string;
    editHref: string;
    onDelete: () => void;
    deleting?: boolean;
}

/**
 * AdminListItem
 * --------------
 * The shared row layout for `AdminJournalListPage`/`AdminWorkListPage` —
 * one component, not two near-identical `<Card>` blocks, because the only
 * real difference between a post row and a work-item row is WHAT goes in
 * the badges/meta slots, never the structure around them.
 *
 * Structure (top → bottom), per live feedback on the previous
 * single-row layout (title/slug/date/buttons all crammed onto one line,
 * wrapping badly on narrow admin viewports — see git history for the
 * screenshot that prompted this):
 * 1. Badges (top-left) + meta (top-right) — always one line each.
 * 2. Title — allowed to wrap up to 3 lines (`line-clamp-3`), NOT forced
 *    onto one line with an ellipsis; every row's height follows its own
 *    title instead of the tallest row in the list forcing every other
 *    row to match it.
 * 3. Slug — de-emphasized, last, optional.
 * Edit/Delete sit to the right of the title specifically (not the badge
 * row, not a footer row) — they're actions on THIS record, and the title
 * is the one line that most obviously identifies which record that is.
 */
export function AdminListItem({ badges, meta, title, slug, editHref, onDelete, deleting }: AdminListItemProps) {
    return (
        <Card variant="outlined" className="p-md flex flex-col gap-sm">
            <div className="flex items-center justify-between gap-sm">
                <div className="flex items-center gap-xs flex-wrap min-w-0">{badges}</div>
                <Text variant="caption" tone="faint" className="font-mono whitespace-nowrap shrink-0">{meta}</Text>
            </div>

            <div className="flex items-start justify-between gap-md">
                <Text variant="body" className="font-medium line-clamp-3 min-w-0">{title}</Text>
                <div className="flex items-center gap-xs shrink-0">
                    <RevealAction as="link" href={editHref} label="Edit" icon={<Pencil className="w-4 h-4" aria-hidden="true" />} />
                    <RevealAction as="button" onClick={onDelete} loading={deleting} label="Delete" tone="danger" icon={<Trash2 className="w-4 h-4" aria-hidden="true" />} />
                </div>
            </div>

            {slug && <Text variant="caption" tone="faint" className="font-mono truncate">{slug}</Text>}
        </Card>
    );
}

type RevealActionProps = {
    label: string;
    icon: React.ReactNode;
    tone?: "default" | "danger";
    loading?: boolean;
} & (
    | { as: "link"; href: string }
    | { as: "button"; onClick: () => void }
);

/**
 * A square icon control that grows to reveal its label on hover/focus,
 * rather than showing "Edit"/"Delete" as text all the time — icon + label
 * cross-fade in place (absolutely positioned, both centered in the same
 * box) while the box itself widens just enough to fit the label, so
 * nothing else in the row shifts except this one control.
 *
 * `tone="danger"` (Delete) only applies its red hover color ON hover —
 * an always-red delete button reads as "something's already wrong" at a
 * glance down a whole list of otherwise-fine records; the color should
 * mean "you're about to act on this," not "warning, permanently."
 */
function RevealAction(props: RevealActionProps) {
    const { label, icon, tone = "default", loading } = props;

    const className = cn(
        "group relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md",
        "border border-border-strong text-text-secondary",
        "transition-[width,color,border-color,background-color] duration-normal ease-standard",
        "hover:w-[4.5rem] focus-visible:w-[4.5rem]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-highlight focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app",
        tone === "danger"
            ? "hover:border-status-error hover:text-status-error hover:bg-status-error/10 focus-visible:border-status-error focus-visible:text-status-error"
            : "hover:border-border-highlight hover:text-text-primary hover:bg-surface-raised focus-visible:border-border-highlight focus-visible:text-text-primary",
        loading && "pointer-events-none opacity-70",
    );

    const content = (
        <>
            <span
                className={cn(
                    "absolute inset-0 flex items-center justify-center transition-opacity duration-fast",
                    loading ? "opacity-0" : "group-hover:opacity-0 group-focus-visible:opacity-0",
                )}
            >
                {icon}
            </span>
            <span
                className={cn(
                    "absolute inset-0 flex items-center justify-center text-caption font-medium whitespace-nowrap opacity-0 transition-opacity duration-fast",
                    loading ? "opacity-100" : "group-hover:opacity-100 group-focus-visible:opacity-100",
                )}
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : label}
            </span>
        </>
    );

    if (props.as === "link") {
        return (
            <Link href={props.href} aria-label={label} className={className}>
                {content}
            </Link>
        );
    }

    return (
        <button type="button" aria-label={label} onClick={props.onClick} disabled={loading} className={className}>
            {content}
        </button>
    );
}
