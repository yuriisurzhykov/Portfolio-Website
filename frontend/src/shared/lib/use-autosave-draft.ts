"use client";

import * as React from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Long on purpose — an admin actively typing shouldn't see a "saving…"
 * indicator (or trigger a real save request) on every pause longer than a
 * second; 800ms was found live to be too aggressive, firing mid-sentence.
 * Safe to raise this far: every navigate-away path (`navigateAfterFlush`,
 * `handlePublish` in `PostEditorPage.tsx`/`WorkEditorPage.tsx`) already
 * calls `flush()` unconditionally before leaving, and those same pages now
 * also flush on blur (see their `<form onBlur>`) — so this timer only
 * governs how long an edit sits unsaved while the admin stays on the page,
 * mid-field, not whether it's saved before they leave it.
 */
const DEFAULT_DEBOUNCE_MS = 3 * 60 * 1000;
/**
 * How long to wait before automatically retrying after a failed save — separate from `debounceMs`,
 * since a retry isn't "the admin typed again," it's "the last attempt didn't make it."
 * */
const RETRY_DELAY_MS = 5000;

export interface UseAutosaveDraftOptions<TInput, TResult> {
    /**
     * `null` until the record exists in the database — every save before that goes through `create()`,
     * every save after goes through `update()`. Read only once, at mount (see this file's top comment)
     * the hook never re-syncs from a later prop change, it tracks the transition internally instead. */
    slug: string | null;
    /**
     * Called fresh, right before EVERY save attempt (debounced, retried, or
     * flushed) — not read once and cached. This is what lets a caller like
     * `PostEditorPage` pass a closure that reads its latest `form` state AND
     * pulls the block editor's current document via
     * `blockEditorRef.current?.getBlocks()` (a ref read, not React state —
     * see `shared/ui/block-editor/README.md`) without this hook needing to
     * know anything about either.
     */
    buildInput: () => TInput;
    /**
     * True while there's nothing worth persisting yet (e.g. an empty title). Only gates the very FIRST save
     * (`slug === null`) — once a record exists, every change is saved regardless, same as it always was for
     * `update()`.
     * */
    isEmpty: (input: TInput) => boolean;
    create: (input: TInput) => Promise<TResult>;
    update: (slug: string, input: TInput) => Promise<TResult>;
    /**
     * How to read the newly assigned slug out of `create()`'s result — kept as an explicit accessor (Interface
     * Segregation) rather than requiring `TResult` to structurally have a `.slug` field, so this hook stays
     * agnostic of `PostSummary`/`WorkSummary`'s exact shape.
     * */
    getSlug: (result: TResult) => string;
    /** Fires when the tracked slug actually changes — first creation, or a later rename via `update()`. Never fires for a same-slug save. See this file's README for the rename bug this closed. */
    onSlugChanged?: (result: TResult) => void;
    /**
     * Fires after every successful save, create or update alike — e.g. so the caller can sync a locally-held
     * `lifecycleState` against the auto-unpublish safety net (`backend/src/content/admin-posts.ts`'s `updatePost`)
     * without this hook knowing that concept exists.
     * */
    onSaved?: (result: TResult, input: TInput) => void;
    onError?: (error: unknown) => void;
    debounceMs?: number;
}

export interface UseAutosaveDraftResult {
    status: AutosaveStatus;
    isDirty: boolean;
    getIsDirty: () => boolean;
    getEditRevision: () => number;
    getResourceSlug: () => string | null;
    /** Called after an explicit publication rename, after the save chain settles. */
    adoptResourceSlug: (slug: string) => void;
    /** Cancels retry state after Discard/restore intentionally adopts server content. */
    resetSavedState: () => void;
    cancelScheduledSave: () => void;
    /**
     * Call after every field/body edit — (re)starts the debounce timer. Safe to call many times in a row;
     * only the last call before the delay elapses actually triggers a save.
     * */
    scheduleSave: () => void;
    /**
     * Saves immediately, skipping the debounce. Resolves once the whole
     * chain settles (including a coalesced follow-up), and REJECTS if
     * that final attempt failed — callers gating a real action (Publish)
     * on "did this save" must await and handle that. A background retry
     * is still scheduled regardless; see this file's README.
     */
    flush: () => Promise<void>;
}

/**
 * Backs "type a title → a draft exists, every further edit saves in the
 * background" (migration plan Phase 3). One hook for both the
 * create-on-first-keystroke transition and every save after — the caller
 * just calls `scheduleSave()`/`flush()` on every edit.
 *
 * At most one request in flight; an edit arriving mid-request coalesces
 * into exactly one follow-up using the latest input, never a queue. See
 * this file's README for the bugs (and one rejected fix) found here by
 * review, not by re-reading this file.
 */
export function useAutosaveDraft<TInput, TResult>(
    options: UseAutosaveDraftOptions<TInput, TResult>,
): UseAutosaveDraftResult {
    const [status, setStatus] = React.useState<AutosaveStatus>("idle");
    const [isDirty, setIsDirty] = React.useState(false);
    const dirtyRef = React.useRef(false);
    const revisionRef = React.useRef(0);

    // Commit the latest callbacks before browser events or timers can save.
    const optionsRef = React.useRef(options);
    React.useLayoutEffect(() => { optionsRef.current = options; });

    const slugRef = React.useRef(options.slug);
    const savingRef = React.useRef(false);
    const pendingRef = React.useRef(false);
    const activeSaveRef = React.useRef<Promise<void> | null>(null);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = React.useRef(true);

    // Does NOT flush a pending edit on unmount — unsafe, not just ineffective; see the README for why. Callers flush explicitly before navigating instead.
    React.useEffect(
        () => {
            mountedRef.current = true;
            return () => {
            mountedRef.current = false;
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
            }
            };
        },
        [],
    );

    function clearTimer() {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }

    /** Synchronous wrapper so `activeSaveRef` is set before this returns, with no gap for a same-tick caller to see a stale value. */
    function performSave(): Promise<void> {
        if (savingRef.current) {
            pendingRef.current = true;
            // Hand back the ALREADY-in-flight promise, not a fresh
            // `Promise.resolve()` — `flush()` relies on this so it
            // genuinely waits for the coalesced follow-up below, not just
            // "a save started at some point."
            return activeSaveRef.current ?? Promise.resolve();
        }
        const promise = runSave();
        activeSaveRef.current = promise;
        return promise;
    }

    async function runSave(): Promise<void> {
        const input = optionsRef.current.buildInput();
        const savingRevision = revisionRef.current;
        if (slugRef.current === null && optionsRef.current.isEmpty(input)) {
            return;
        }

        savingRef.current = true;
        if (mountedRef.current) {
            setStatus("saving");
        }

        const currentSlug = slugRef.current;
        let hadError = false;
        let caughtError: unknown;
        try {
            const result = currentSlug === null
                ? await optionsRef.current.create(input)
                : await optionsRef.current.update(currentSlug, input);
            // Re-synced from every save, not just create() — update() can rename too.
            const resolvedSlug = optionsRef.current.getSlug(result);
            if (resolvedSlug !== currentSlug) {
                slugRef.current = resolvedSlug;
                optionsRef.current.onSlugChanged?.(result);
            }
            optionsRef.current.onSaved?.(result, input);
            if (savingRevision === revisionRef.current) {
                dirtyRef.current = false;
                if (mountedRef.current) setIsDirty(false);
            }
            if (mountedRef.current) {
                setStatus("saved");
            }
        } catch (error) {
            hadError = true;
            caughtError = error;
            if (mountedRef.current) {
                setStatus("error");
            }
            optionsRef.current.onError?.(error);
            clearTimer();
            timerRef.current = setTimeout(() => {
                timerRef.current = null;
                // Fire-and-forget — swallow so this doesn't surface as an unhandled rejection; `flush()` gets its own, un-swallowed promise.
                void performSave().catch(() => {});
            }, RETRY_DELAY_MS);
        }

        savingRef.current = false;

        if (pendingRef.current) {
            pendingRef.current = false;
            // Supersedes this attempt's outcome — `return` inside `async` adopts the follow-up's eventual state.
            return performSave();
        }

        activeSaveRef.current = null;
        if (hadError) {
            throw caughtError;
        }
    }

    function scheduleSave() {
        revisionRef.current++;
        dirtyRef.current = true;
        if (mountedRef.current) setIsDirty(true);
        clearTimer();
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            void performSave().catch(() => {});
        }, optionsRef.current.debounceMs ?? DEFAULT_DEBOUNCE_MS);
    }

    /** Not swallowed — callers like `handlePublish` need the real rejection. */
    function flush(): Promise<void> {
        clearTimer();
        return performSave();
    }

    function adoptResourceSlug(slug: string) {
        if (savingRef.current) throw new Error("Wait for the current save before changing resource identity.");
        slugRef.current = slug;
    }

    function resetSavedState() {
        if (savingRef.current) throw new Error("Wait for the current save before adopting server content.");
        clearTimer();
        pendingRef.current = false;
        dirtyRef.current = false;
        if (mountedRef.current) { setIsDirty(false); setStatus("saved"); }
    }

    return { status, isDirty, scheduleSave, flush, adoptResourceSlug, resetSavedState,
        cancelScheduledSave: clearTimer,
        getResourceSlug: () => slugRef.current, getEditRevision: () => revisionRef.current, getIsDirty: () => dirtyRef.current };
}
