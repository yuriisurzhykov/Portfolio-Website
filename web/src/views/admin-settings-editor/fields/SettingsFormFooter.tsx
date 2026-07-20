"use client";

import * as React from "react";
import { Button } from "@/shared/ui/button";
import { Text } from "@/shared/ui/text";

export interface SettingsFormFooterProps {
    submitting: boolean;
    error: string | null;
    /** `Date.now()` of the last successful save, from `useSiteContentForm` — used only to decide whether to show the "Saved" confirmation, not displayed as an actual timestamp. */
    savedAt: number | null;
}

/**
 * There's no "Cancel"/navigate-away button here, unlike `WorkEditorPage` —
 * a settings section isn't a record you create/discard; there's always
 * exactly one `hero`/`contact`/etc. to come back to, so "leave without
 * saving" just means "browse to another admin page," nothing this form
 * needs to offer a button for.
 */
export function SettingsFormFooter({ submitting, error, savedAt }: SettingsFormFooterProps) {
    return (
        <div className="flex items-center gap-md">
            <Button type="submit" loading={submitting}>
                Save changes
            </Button>
            {error && (
                <Text variant="caption" className="text-status-error" role="alert">
                    {error}
                </Text>
            )}
            {!error && savedAt && (
                <Text variant="caption" tone="muted" role="status">
                    Saved.
                </Text>
            )}
        </div>
    );
}
