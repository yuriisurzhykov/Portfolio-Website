"use client";
import * as React from "react";
import { Button } from "@/shared/ui/button";
import type { ContentUrlState } from "../model/types";
import { EditUrlDialog } from "./EditUrlDialog";

export function ContentUrlField({
    state,
    section,
    onManualApply,
    disabled,
}: {
    state: ContentUrlState;
    section: "journal" | "work";
    onManualApply(slug: string): void;
    disabled?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const pending = Boolean(state.canonicalSlug && state.draftSlug && state.canonicalSlug !== state.draftSlug);
    return (
        <section aria-label="Content URL" className="flex min-w-0 flex-col gap-xs border-t border-border-subtle pt-md">
            <div className="flex items-center justify-between gap-xs">
                <span className="text-caption text-text-secondary">
                    {section === "work" ? "Project URL" : "Post URL"}
                </span>
                <Button appearance="flat" size="sm" variant="ghost" disabled={disabled} onClick={() => setOpen(true)}>
                    Edit URL
                </Button>
            </div>
            {state.draftSlug ? (
                <code className="break-all text-caption text-text-secondary">
                    /{section}/{state.draftSlug}
                </code>
            ) : (
                <p className="text-caption text-text-muted">Generated from the title</p>
            )}
            {pending && (
                <p className="break-all text-caption text-text-muted">
                    Current address: /{section}/{state.canonicalSlug}. Rename applies on publication.
                </p>
            )}
            <p className="text-caption text-text-muted">
                {state.mode === "auto" && !state.hasEverBeenPublished
                    ? "Generated from title until first publication."
                    : "Stable address. Title edits do not change it."}
            </p>
            {open && (
                <EditUrlDialog
                    open={open}
                    slug={state.draftSlug}
                    hasEverBeenPublished={state.hasEverBeenPublished}
                    onClose={() => setOpen(false)}
                    onApply={onManualApply}
                />
            )}
        </section>
    );
}
