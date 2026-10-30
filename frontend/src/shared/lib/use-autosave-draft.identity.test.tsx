import * as React from "react";
import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useAutosaveDraft } from "./use-autosave-draft";

it("marks edits dirty immediately and adopts a published rename for the next save", async () => {
    const updates: string[] = [];
    const { result, unmount } = renderHook(() => useAutosaveDraft({ slug: "old", buildInput: () => ({ title: "Hello" }), isEmpty: () => false,
        create: async () => ({ slug: "new" }), update: async slug => { updates.push(slug); return { slug }; }, getSlug: item => item.slug }));
    act(() => result.current.scheduleSave());
    expect(result.current.isDirty).toBe(true);
    await act(async () => result.current.flush());
    expect(result.current.isDirty).toBe(false);
    act(() => result.current.adoptResourceSlug("renamed"));
    await act(async () => result.current.flush());
    expect(updates).toEqual(["old", "renamed"]);
    expect(result.current.getResourceSlug()).toBe("renamed");
    unmount();
});

it("keeps a newer local revision dirty while an older save is acknowledged", async () => {
    let resolve!: (item: { slug: string }) => void;
    const saving = new Promise<{ slug: string }>(done => { resolve = done; });
    const { result } = renderHook(() => useAutosaveDraft({ slug: "draft", buildInput: () => ({ title: "Text" }), isEmpty: () => false,
        create: async () => ({ slug: "draft" }), update: () => saving, getSlug: item => item.slug }));
    act(() => result.current.scheduleSave());
    let flush!: Promise<void>; act(() => { flush = result.current.flush(); });
    act(() => result.current.scheduleSave());
    await act(async () => { resolve({ slug: "draft" }); await flush; });
    expect(result.current.isDirty).toBe(true);
});

it("cancels failed-save retry when a deliberate external reset adopts server content", async () => {
    vi.useFakeTimers();
    const update = vi.fn().mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useAutosaveDraft({ slug: "draft", buildInput: () => ({}), isEmpty: () => false,
        create: async () => ({ slug: "draft" }), update, getSlug: item => item.slug }));
    act(() => result.current.scheduleSave());
    await act(async () => { await result.current.flush().catch(() => {}); });
    act(() => result.current.resetSavedState());
    await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
    expect(update).toHaveBeenCalledOnce();
    expect(result.current.isDirty).toBe(false);
    vi.useRealTimers();
});

it("acknowledges a save after StrictMode replays effect setup", async () => {
    const { result } = renderHook(() => useAutosaveDraft({ slug: null, buildInput: () => ({}), isEmpty: () => false,
        create: async () => ({ slug: "created" }), update: async slug => ({ slug }), getSlug: item => item.slug }),
        { wrapper: ({ children }) => <React.StrictMode>{children}</React.StrictMode> });
    act(() => result.current.scheduleSave());
    await act(async () => result.current.flush());
    expect(result.current.status).toBe("saved");
    expect(result.current.getResourceSlug()).toBe("created");
});
