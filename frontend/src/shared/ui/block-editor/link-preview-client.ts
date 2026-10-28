"use client";

import * as React from "react";
import type { LinkPreviewView } from "@portfolio/backend";
import { adminApi } from "@/shared/lib/admin-api";

/**
 * One request per URL per editor session, shared by every block and badge
 * showing it: a post that links the same repo five times asks once. A
 * forced refresh replaces the cached promise, so every chip of that URL
 * picks up the new snapshot on its next render.
 */
const cache = new Map<string, Promise<LinkPreviewView | null>>();
const listeners = new Set<() => void>();

export function fetchEditorLinkPreview(url: string, force = false): Promise<LinkPreviewView | null> {
    const cached = cache.get(url);
    if (cached && !force) {
        return cached;
    }
    const request = adminApi.linkPreview(url, force).then(
        (response) => response.preview,
        () => {
            // A failed request (network, 4xx) is not cached — the next render
            // or the "Refresh" button tries again instead of being stuck.
            cache.delete(url);
            return null;
        },
    );
    cache.set(url, request);
    if (force) {
        void request.then(() => listeners.forEach((notify) => notify()));
    }
    return request;
}

export interface EditorLinkPreviewState {
    preview: LinkPreviewView | null;
    loading: boolean;
    refresh: () => void;
}

/**
 * The editor's view of one URL's preview. `delayMs` debounces typing in the
 * linkCard's URL field (400 ms — the design doc's number), so the server
 * isn't asked about every half-typed URL; a badge, whose URL never changes
 * after paste, passes 0.
 */
export function useEditorLinkPreview(url: string, delayMs = 0): EditorLinkPreviewState {
    const [state, setState] = React.useState<{ url: string; preview: LinkPreviewView | null } | null>(null);
    const [version, setVersion] = React.useState(0);

    React.useEffect(() => {
        const notify = () => setVersion((value) => value + 1);
        listeners.add(notify);
        return () => {
            listeners.delete(notify);
        };
    }, []);

    React.useEffect(() => {
        if (!url) {
            return;
        }
        let cancelled = false;
        const timer = setTimeout(() => {
            void fetchEditorLinkPreview(url).then((preview) => {
                if (!cancelled) {
                    setState({ url, preview });
                }
            });
        }, delayMs);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [url, delayMs, version]);

    const refresh = React.useCallback(() => {
        if (url) {
            setState(null);
            void fetchEditorLinkPreview(url, true);
        }
    }, [url]);

    const current = state?.url === url ? state.preview : null;
    return { preview: current, loading: Boolean(url) && state?.url !== url, refresh };
}
