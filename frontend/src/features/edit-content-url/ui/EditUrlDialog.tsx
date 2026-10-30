"use client";
import * as React from "react";
import { Dialog } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/form";
import { isValidDraftSlug } from "../model/url-policy";

export function EditUrlDialog({
    open,
    slug,
    hasEverBeenPublished,
    onClose,
    onApply,
}: {
    open: boolean;
    slug: string;
    hasEverBeenPublished: boolean;
    onClose(): void;
    onApply(slug: string): void;
}) {
    const [candidate, setCandidate] = React.useState(slug);
    const [error, setError] = React.useState<string>();
    function apply() {
        const value = candidate.trim();
        if (!isValidDraftSlug(value)) {
            setError("Use lowercase letters, numbers and single hyphens.");
            return;
        }
        onApply(value);
        onClose();
    }
    return (
        <Dialog open={open} title="Edit URL" onClose={onClose}>
            <div className="flex flex-col gap-lg">
                <p className="text-body text-text-secondary">
                    {hasEverBeenPublished
                        ? "This creates a pending rename. The live address changes only when you publish the update."
                        : "A manual address stops automatic updates when the title changes."}
                </p>
                <Field label="URL path" htmlFor="content-url-path" error={error}>
                    <Input
                        id="content-url-path"
                        appearance="inset"
                        value={candidate}
                        onChange={(event) => {
                            setCandidate(event.target.value);
                            setError(undefined);
                        }}
                    />
                </Field>
                <div className="flex flex-wrap gap-sm">
                    <Button appearance="flat" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button appearance="flat" onClick={apply}>
                        Apply URL
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
