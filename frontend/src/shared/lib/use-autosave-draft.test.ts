import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutosaveDraft } from "./use-autosave-draft";

interface TestInput {
    title: string;
}
interface TestResult {
    slug: string;
    title: string;
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

describe("useAutosaveDraft", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("never calls create() while isEmpty(input) stays true, even long after the debounce elapses", async () => {
        const create = vi.fn();
        const input: TestInput = { title: "" };
        const { result } = renderHook(() =>
            useAutosaveDraft<TestInput, TestResult>({
                slug: null,
                buildInput: () => input,
                isEmpty: (i) => i.title.trim().length === 0,
                create,
                update: vi.fn(),
                getSlug: (r) => r.slug,
                debounceMs: 100,
            }),
        );

        act(() => result.current.scheduleSave());
        await act(async () => {
            await vi.advanceTimersByTimeAsync(10_000);
        });

        expect(create).not.toHaveBeenCalled();
        expect(result.current.status).toBe("idle");
    });

    it("waits for the full debounce delay before saving — not a moment earlier", async () => {
        const create = vi.fn().mockReturnValue(new Promise<never>(() => {}));
        const input: TestInput = { title: "Hello" };
        const { result } = renderHook(() =>
            useAutosaveDraft<TestInput, TestResult>({
                slug: null,
                buildInput: () => input,
                isEmpty: (i) => i.title.trim().length === 0,
                create,
                update: vi.fn(),
                getSlug: (r) => r.slug,
                debounceMs: 800,
            }),
        );

        act(() => result.current.scheduleSave());
        await act(async () => {
            await vi.advanceTimersByTimeAsync(799);
        });
        expect(create).not.toHaveBeenCalled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1);
        });
        expect(create).toHaveBeenCalledTimes(1);
    });

    /**
     * Pins the actual PRODUCTION default (every other test above/below
     * passes its own explicit `debounceMs`, so nothing else in this file
     * would catch the default silently drifting back down to something
     * that interrupts active typing — see `use-autosave-draft.ts`'s
     * `DEFAULT_DEBOUNCE_MS` comment for why this needs to stay long).
     */
    it("defaults to a 3-minute debounce when debounceMs is not provided at all", async () => {
        const create = vi.fn().mockResolvedValue({ slug: "s", title: "T" });
        const input: TestInput = { title: "T" };
        const { result } = renderHook(() =>
            useAutosaveDraft<TestInput, TestResult>({
                slug: null,
                buildInput: () => input,
                isEmpty: () => false,
                create,
                update: vi.fn(),
                getSlug: (r) => r.slug,
            }),
        );

        act(() => result.current.scheduleSave());
        await act(async () => {
            await vi.advanceTimersByTimeAsync(3 * 60 * 1000 - 1);
        });
        expect(create).not.toHaveBeenCalled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1);
        });
        expect(create).toHaveBeenCalledTimes(1);
    });

    it("re-debounces on every scheduleSave() call — a second edit before the delay elapses resets the timer instead of stacking a second save", async () => {
        const create = vi.fn().mockResolvedValue({ slug: "s", title: "x" });
        const input: TestInput = { title: "Hello" };
        const { result } = renderHook(() =>
            useAutosaveDraft<TestInput, TestResult>({
                slug: null,
                buildInput: () => input,
                isEmpty: () => false,
                create,
                update: vi.fn(),
                getSlug: (r) => r.slug,
                debounceMs: 100,
            }),
        );

        act(() => result.current.scheduleSave());
        await act(async () => {
            await vi.advanceTimersByTimeAsync(60);
        });
        act(() => result.current.scheduleSave()); // arrives before the first timer would have fired
        await act(async () => {
            await vi.advanceTimersByTimeAsync(60);
        });
        expect(create).not.toHaveBeenCalled(); // only 60ms since the reset, not the full 100ms yet

        await act(async () => {
            await vi.advanceTimersByTimeAsync(40);
        });
        expect(create).toHaveBeenCalledTimes(1);
    });

    it("creates once via create(), then every later save goes through update() with the assigned slug — never create() again", async () => {
        const create = vi.fn().mockResolvedValue({ slug: "new-slug", title: "v1" });
        const update = vi.fn().mockResolvedValue({ slug: "new-slug", title: "v2" });
        const onSlugChanged = vi.fn();
        let input: TestInput = { title: "v1" };
        const { result } = renderHook(() =>
            useAutosaveDraft<TestInput, TestResult>({
                slug: null,
                buildInput: () => input,
                isEmpty: (i) => i.title.trim().length === 0,
                create,
                update,
                getSlug: (r) => r.slug,
                onSlugChanged,
                debounceMs: 100,
            }),
        );

        act(() => result.current.scheduleSave());
        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });
        expect(create).toHaveBeenCalledTimes(1);
        expect(onSlugChanged).toHaveBeenCalledExactlyOnceWith({ slug: "new-slug", title: "v1" });
        expect(result.current.status).toBe("saved");

        input = { title: "v2" };
        act(() => result.current.scheduleSave());
        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });

        expect(update).toHaveBeenCalledExactlyOnceWith("new-slug", { title: "v2" });
        expect(create).toHaveBeenCalledTimes(1);
        // No further `onSlugChanged` call — the slug didn't change on this second save.
        expect(onSlugChanged).toHaveBeenCalledTimes(1);
    });

    it("re-syncs its tracked slug when an UPDATE (not just the initial create) returns a DIFFERENT slug — e.g. the admin renamed the record via the Slug field", async () => {
        const update = vi.fn()
            .mockResolvedValueOnce({ slug: "renamed-slug", title: "v1" })
            .mockResolvedValueOnce({ slug: "renamed-slug", title: "v2" });
        const onSlugChanged = vi.fn();
        let input: TestInput = { title: "v1" };
        const { result } = renderHook(() =>
            useAutosaveDraft<TestInput, TestResult>({
                slug: "original-slug",
                buildInput: () => input,
                isEmpty: () => false,
                create: vi.fn(),
                update,
                getSlug: (r) => r.slug,
                onSlugChanged,
                debounceMs: 100,
            }),
        );

        act(() => result.current.scheduleSave());
        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });
        expect(update).toHaveBeenNthCalledWith(1, "original-slug", { title: "v1" });
        expect(onSlugChanged).toHaveBeenCalledExactlyOnceWith({ slug: "renamed-slug", title: "v1" });

        // The bug this pins: without re-syncing, this next save would still
        // target "original-slug" — which the backend already renamed away
        // from, so a real `update()` there would 404.
        input = { title: "v2" };
        act(() => result.current.scheduleSave());
        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });
        expect(update).toHaveBeenNthCalledWith(2, "renamed-slug", { title: "v2" });
        expect(onSlugChanged).toHaveBeenCalledTimes(1); // no rename on the second save — no second call
    });

    it("coalesces edits that arrive while a save is in flight into exactly one follow-up save, using the LATEST input", async () => {
        const firstSave = deferred<TestResult>();
        const update = vi.fn().mockReturnValueOnce(firstSave.promise).mockResolvedValueOnce({ slug: "s", title: "v3" });
        let input: TestInput = { title: "v1" };
        const { result } = renderHook(() =>
            useAutosaveDraft<TestInput, TestResult>({
                slug: "s",
                buildInput: () => input,
                isEmpty: () => false,
                create: vi.fn(),
                update,
                getSlug: (r) => r.slug,
                debounceMs: 100,
            }),
        );

        act(() => result.current.scheduleSave());
        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });
        expect(update).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe("saving"); // first save still unresolved

        // Two more edits land while the first request is still in flight.
        input = { title: "v2" };
        act(() => result.current.scheduleSave());
        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });
        input = { title: "v3" };
        act(() => result.current.scheduleSave());
        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });

        // Neither debounced attempt could actually run — the first request never resolved.
        expect(update).toHaveBeenCalledTimes(1);

        await act(async () => {
            firstSave.resolve({ slug: "s", title: "v1" });
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(update).toHaveBeenCalledTimes(2);
        expect(update).toHaveBeenLastCalledWith("s", { title: "v3" });
    });

    it("flush() bypasses the debounce timer and resolves only once the whole chain (including a coalesced follow-up) has settled", async () => {
        const firstSave = deferred<TestResult>();
        const secondSave = deferred<TestResult>();
        const update = vi.fn().mockReturnValueOnce(firstSave.promise).mockReturnValueOnce(secondSave.promise);
        let input: TestInput = { title: "v1" };
        const onSaved = vi.fn();
        const { result } = renderHook(() =>
            useAutosaveDraft<TestInput, TestResult>({
                slug: "s",
                buildInput: () => input,
                isEmpty: () => false,
                create: vi.fn(),
                update,
                getSlug: (r) => r.slug,
                onSaved,
                debounceMs: 5_000,
            }),
        );

        let flushResolved = false;
        act(() => {
            result.current.flush().then(() => {
                flushResolved = true;
            });
        });
        expect(update).toHaveBeenCalledTimes(1);

        // A second edit arrives before the first flush's request settles.
        input = { title: "v2" };
        act(() => result.current.scheduleSave());
        await act(async () => {
            await vi.advanceTimersByTimeAsync(10_000); // would fire the debounce if it weren't coalesced
        });
        expect(update).toHaveBeenCalledTimes(1); // still just the flush's own request

        await act(async () => {
            firstSave.resolve({ slug: "s", title: "v1" });
            await Promise.resolve();
            await Promise.resolve();
        });
        expect(update).toHaveBeenCalledTimes(2); // coalesced follow-up fired
        expect(flushResolved).toBe(false); // ...but hasn't resolved yet — the follow-up is still in flight

        await act(async () => {
            secondSave.resolve({ slug: "s", title: "v2" });
            await Promise.resolve();
            await Promise.resolve();
        });
        expect(flushResolved).toBe(true);
        expect(onSaved).toHaveBeenCalledTimes(2);
    });

    it("on failure, sets status to 'error', calls onError, and automatically retries after the retry delay", async () => {
        const onError = vi.fn();
        const update = vi.fn().mockRejectedValueOnce(new Error("network down")).mockResolvedValueOnce({ slug: "s", title: "v1" });
        const input: TestInput = { title: "v1" };
        const { result } = renderHook(() =>
            useAutosaveDraft<TestInput, TestResult>({
                slug: "s",
                buildInput: () => input,
                isEmpty: () => false,
                create: vi.fn(),
                update,
                getSlug: (r) => r.slug,
                onError,
                debounceMs: 100,
            }),
        );

        act(() => result.current.scheduleSave());
        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });
        expect(update).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe("error");
        expect(onError).toHaveBeenCalledExactlyOnceWith(expect.any(Error));

        // No further scheduleSave() call needed — the retry is automatic.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(5_000);
        });
        expect(update).toHaveBeenCalledTimes(2);
        expect(result.current.status).toBe("saved");
    });

    it("flush() REJECTS when the save it triggers fails — a caller gating Publish on this must see the failure, not a false success", async () => {
        const update = vi.fn().mockRejectedValue(new Error("network down"));
        const input: TestInput = { title: "v1" };
        const { result } = renderHook(() =>
            useAutosaveDraft<TestInput, TestResult>({
                slug: "s",
                buildInput: () => input,
                isEmpty: () => false,
                create: vi.fn(),
                update,
                getSlug: (r) => r.slug,
                debounceMs: 5_000,
            }),
        );

        let flushError: unknown = "not yet settled";
        await act(async () => {
            await result.current.flush().catch((error: unknown) => {
                flushError = error;
            });
        });

        expect(flushError).toBeInstanceOf(Error);
        expect((flushError as Error).message).toBe("network down");
    });

    it("still schedules a background retry after a flush()-triggered failure, and that retry can go on to succeed", async () => {
        const update = vi.fn().mockRejectedValueOnce(new Error("network down")).mockResolvedValueOnce({ slug: "s", title: "v1" });
        const input: TestInput = { title: "v1" };
        const { result } = renderHook(() =>
            useAutosaveDraft<TestInput, TestResult>({
                slug: "s",
                buildInput: () => input,
                isEmpty: () => false,
                create: vi.fn(),
                update,
                getSlug: (r) => r.slug,
                debounceMs: 5_000,
            }),
        );

        await act(async () => {
            await result.current.flush().catch(() => {});
        });
        expect(update).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe("error");

        // The bug this pins: rejecting `flush()` must not come at the cost
        // of dropping the automatic background retry — the fix keeps both.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(5_000);
        });
        expect(update).toHaveBeenCalledTimes(2);
        expect(result.current.status).toBe("saved");
    });

    it("resolves flush() successfully when the original attempt fails but a coalesced follow-up (using the latest input) goes on to succeed", async () => {
        const firstSave = deferred<TestResult>();
        const update = vi.fn().mockReturnValueOnce(firstSave.promise).mockResolvedValueOnce({ slug: "s", title: "v2" });
        let input: TestInput = { title: "v1" };
        const { result } = renderHook(() =>
            useAutosaveDraft<TestInput, TestResult>({
                slug: "s",
                buildInput: () => input,
                isEmpty: () => false,
                create: vi.fn(),
                update,
                getSlug: (r) => r.slug,
                debounceMs: 5_000,
            }),
        );

        let flushSettled: "pending" | "resolved" | "rejected" = "pending";
        act(() => {
            result.current
                .flush()
                .then(() => {
                    flushSettled = "resolved";
                })
                .catch(() => {
                    flushSettled = "rejected";
                });
        });

        // A second edit arrives while the (about to fail) first request is still in flight.
        input = { title: "v2" };
        act(() => result.current.scheduleSave());
        await act(async () => {
            await vi.advanceTimersByTimeAsync(10_000);
        });
        expect(update).toHaveBeenCalledTimes(1); // coalesced follow-up hasn't fired yet — first request still unsettled

        await act(async () => {
            firstSave.reject(new Error("network down"));
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(update).toHaveBeenCalledTimes(2); // the coalesced follow-up (v2) fired despite the first failing
        expect(flushSettled).toBe("resolved"); // the LATEST state is actually saved now — a real success, not masked by the earlier failure
    });
});
