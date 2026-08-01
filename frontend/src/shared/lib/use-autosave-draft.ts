"use client";

import * as React from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

const DEFAULT_DEBOUNCE_MS = 800;
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
    /**
     * Fires exactly once, right after `create()` first succeeds — the caller's one chance to `router.replace()`
     * onto the real edit URL. Navigation is deliberately NOT this hook's own job (it knows nothing about
     * `/admin/journal` vs `/admin/work` URL shapes) — that's the caller's concern, this hook only tracks
     * "does a record exist yet."
     * */
    onCreated?: (result: TResult) => void;
    /**
     * Fires after every successful save, create or update alike — e.g. so the caller can sync a locally-held
     * `lifecycleState` against the auto-unpublish safety net (`backend/src/content/admin-posts.ts`'s `updatePost`)
     * without this hook knowing that concept exists.
     * */
    onSaved?: (result: TResult) => void;
    onError?: (error: unknown) => void;
    debounceMs?: number;
}

export interface UseAutosaveDraftResult {
    status: AutosaveStatus;
    /**
     * Call after every field/body edit — (re)starts the debounce timer. Safe to call many times in a row;
     * only the last call before the delay elapses actually triggers a save.
     * */
    scheduleSave: () => void;
    /**
     * Saves immediately, skipping any pending debounce — e.g. before Publish, so the strict publish check
     * reads what's actually on screen. Resolves only once the ENTIRE chain (including any coalesced follow-up
     * save queued while this one was in flight) has settled, not just the first request.
     * */
    flush: () => Promise<void>;
}

/**
 * The single hook behind "type a title → a draft exists in the database,
 * every further edit is saved in the background" (see the migration plan's
 * Phase 3, "Мгновенный черновик + непрерывный autosave"). Deliberately ONE
 * hook for both the create-on-first-keystroke transition AND every save
 * after — a page never has to know which one is about to happen, it just
 * calls `scheduleSave()`/`flush()` on every edit.
 *
 * **Concurrency: exactly one in-flight request, exactly one coalesced
 * follow-up.** If an edit arrives while a save is already in flight, this
 * does NOT cancel/race it and does NOT queue one request per edit — it sets
 * a single flag and, once the in-flight request settles, fires ONE more
 * save built from whatever `buildInput()` returns AT THAT LATER MOMENT
 * (always the latest edits, never a stale snapshot). This is what prevents
 * an older, slower response from a first save landing after a second,
 * newer save's response — there is never more than one request in flight,
 * so there is nothing for an out-of-order response to race against.
 *
 * **Known, accepted limitation.** The very first save's `create()` call
 * changes the page's URL (via the caller's `onCreated`, typically
 * `router.replace()`) to a DIFFERENT Next.js route (`/admin/journal/new` →
 * `/admin/journal/[slug]/edit`) — a real route-tree change, not a shallow
 * URL update, so the editor page actually remounts with server-fetched
 * data once that navigation completes. Keystrokes typed in the brief
 * window between `create()`'s response and that remount are covered by the
 * coalescing behavior above (they trigger exactly one `update()` using the
 * new slug before anything settles) — but on a slow connection there's no
 * hard guarantee the remount always waits for that follow-up `update()` to
 * land first. Accepted rather than engineered away: this is a narrow race
 * on a single roundtrip, and the alternative (blocking navigation on a
 * network round trip) would reintroduce the exact "stuck until a request
 * completes" feeling Phase 1 (resilient sessions) exists to remove.
 */
export function useAutosaveDraft<TInput, TResult>(
    options: UseAutosaveDraftOptions<TInput, TResult>,
): UseAutosaveDraftResult {
    const [status, setStatus] = React.useState<AutosaveStatus>("idle");

    // Re-assigned every render (not inside an effect) so any save that runs
    // later — after a debounce delay, after a retry, from inside another
    // save's `finally` — always calls into the LATEST render's closures
    // (latest `form` state, latest callbacks), never a stale one captured
    // when the hook was first set up.
    const optionsRef = React.useRef(options);
    optionsRef.current = options;

    const slugRef = React.useRef(options.slug);
    const savingRef = React.useRef(false);
    const pendingRef = React.useRef(false);
    const activeSaveRef = React.useRef<Promise<void> | null>(null);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = React.useRef(true);

    React.useEffect(
        () => () => {
            mountedRef.current = false;
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
            }
        },
        [],
    );

    function clearTimer() {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }

    function performSave(): Promise<void> {
        if (savingRef.current) {
            pendingRef.current = true;
            // Hand back the ALREADY-in-flight promise, not a fresh
            // `Promise.resolve()` — `flush()` relies on this so it
            // genuinely waits for the coalesced follow-up below, not just
            // "a save started at some point."
            return activeSaveRef.current ?? Promise.resolve();
        }

        const input = optionsRef.current.buildInput();
        if (slugRef.current === null && optionsRef.current.isEmpty(input)) {
            return Promise.resolve();
        }

        savingRef.current = true;
        if (mountedRef.current) {
            setStatus("saving");
        }

        const currentSlug = slugRef.current;
        const save = (currentSlug === null ? optionsRef.current.create(input) : optionsRef.current.update(currentSlug, input))
            .then((result) => {
                if (currentSlug === null) {
                    slugRef.current = optionsRef.current.getSlug(result);
                    optionsRef.current.onCreated?.(result);
                }
                optionsRef.current.onSaved?.(result);
                if (mountedRef.current) {
                    setStatus("saved");
                }
            })
            .catch((error: unknown) => {
                if (mountedRef.current) {
                    setStatus("error");
                }
                optionsRef.current.onError?.(error);
                clearTimer();
                timerRef.current = setTimeout(() => {
                    timerRef.current = null;
                    void performSave();
                }, RETRY_DELAY_MS);
            })
            .finally(() => {
                savingRef.current = false;
                if (pendingRef.current) {
                    pendingRef.current = false;
                    // Returned (not just fired-and-forgotten) so `.finally()`
                    // itself waits for this nested chain — see the spec
                    // note in this hook's own tests: `Promise.finally`
                    // delays settling on whatever its callback returns.
                    // That's what makes `activeSaveRef.current`/anything
                    // awaiting THIS `save` promise correctly wait for the
                    // coalesced follow-up too, however deep it recurses.
                    const next = performSave();
                    activeSaveRef.current = next;
                    return next;
                }
                activeSaveRef.current = null;
            });

        activeSaveRef.current = save;
        return save;
    }

    function scheduleSave() {
        clearTimer();
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            void performSave();
        }, optionsRef.current.debounceMs ?? DEFAULT_DEBOUNCE_MS);
    }

    function flush(): Promise<void> {
        clearTimer();
        return performSave();
    }

    return { status, scheduleSave, flush };
}
