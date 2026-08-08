"use client";

import * as React from "react";
import { Button } from "@/shared/ui/button";
import { Text } from "@/shared/ui/text";

export interface SettingsFormFooterProps {
    submitting: boolean;
    error: string | null;
    /** `Date.now()` of the last successful save, from `useSiteContentForm` — used only to decide whether to show the "Saved" confirmation, not displayed as an actual timestamp. */
    savedAt: number | null;
    /**
     * Whether the form holds changes that aren't saved yet. Optional, and
     * only `TechStackSettingsForm` passes it today — the other six sections
     * are a handful of fields you can see all at once, where "did I save?"
     * isn't a real question. The tech-stack list is the one place an admin
     * can add twenty rows in half a minute and scroll well past the button.
     */
    dirty?: boolean;
}

/**
 * There's no "Cancel"/navigate-away button here, unlike `WorkEditorPage` —
 * a settings section isn't a record you create/discard; there's always
 * exactly one `hero`/`contact`/etc. to come back to, so "leave without
 * saving" just means "browse to another admin page," nothing this form
 * needs to offer a button for.
 *
 * `sticky bottom-0` rather than "wherever the form happens to end": the
 * admin `(dashboard)` layout scrolls the page itself (no inner overflow
 * container), and the tech-stack section is now long enough that a save
 * button pinned to the bottom of the document would be several screens
 * away from the row you just edited.
 */
export function SettingsFormFooter({ submitting, error, savedAt, dirty }: SettingsFormFooterProps) {
    return (
        <div className="sticky bottom-0 z-10 flex items-center gap-md border-t border-border-subtle bg-bg-app py-md">
            <Button type="submit" loading={submitting}>
                Save changes
            </Button>
            {error && (
                <Text variant="caption" className="text-status-error" role="alert">
                    {error}
                </Text>
            )}
            {!error && dirty && !submitting && (
                <Text variant="caption" className="text-status-warning" role="status">
                    Unsaved changes.
                </Text>
            )}
            {!error && !dirty && savedAt && (
                <Text variant="caption" tone="muted" role="status">
                    Saved.
                </Text>
            )}
        </div>
    );
}
