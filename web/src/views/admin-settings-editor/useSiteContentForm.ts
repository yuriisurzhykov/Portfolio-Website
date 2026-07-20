"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { SiteContentDataMap, SiteContentKey } from "@portfolio/backend";
import { AdminApiError, adminApi } from "@/shared/lib/admin-api";

/**
 * Shared submit/error/saved-state plumbing for all 7 settings forms — same
 * "will this be reused?" reasoning that put `replaceDocumentContent` in
 * one place on the backend: without this, each of the 7 forms below would
 * repeat the exact same try/catch/`AdminApiError` check `WorkEditorPage`
 * has inline (it doesn't need to share it — there's only one of it).
 *
 * Deliberately does NOT hold the form's own field state (unlike
 * `WorkEditorPage`, which is a single component) — each settings form has
 * a genuinely different shape (`hero`'s `graphNodes` array vs. `config`'s
 * flat fields), and forcing them through one generic `data: SiteContentDataMap[K]`
 * state would mean editing derived representations (comma-joined chip
 * lists, newline-joined heading lines) THROUGH that shape on every
 * keystroke — the same pitfall `WorkEditorPage`'s comma-separated `stack`
 * field avoids by keeping its `FormState` as plain strings, converting to
 * the real shape only in `handleSubmit`. Each form keeps its own
 * `useState`, following that exact convention, and only hands this hook
 * the final `SiteContentDataMap[K]` value once, at submit time.
 */
export function useSiteContentForm<K extends SiteContentKey>(key: K) {
    const router = useRouter();
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [savedAt, setSavedAt] = React.useState<number | null>(null);

    async function submit(data: SiteContentDataMap[K]) {
        setError(null);
        setSubmitting(true);
        try {
            await adminApi.updateSiteContent(key, data);
            setSavedAt(Date.now());
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
            // Refreshes the Server Component tree regardless of
            // success/failure — cheap, and means a successful save is
            // immediately reflected if the admin navigates to another
            // settings page (or the public site, in another tab) without
            // a full reload, same reasoning as `AdminNav`'s logout button.
            router.refresh();
        }
    }

    return { submitting, error, savedAt, submit };
}
