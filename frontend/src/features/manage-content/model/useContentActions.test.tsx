import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useContentActions, type ContentActionPort } from "./useContentActions";
function port() {
    return {
        flushDraft: vi.fn(async () => {}),
        getResourceSlug: vi.fn((): string | null => "post"),
        getEditRevision: () => 0,
        validateForPublication: () => [],
        publish: vi.fn(async () => {}),
        unpublish: vi.fn(async () => {}),
        discardDraft: vi.fn(async () => {}),
        deleteContent: vi.fn(async () => {}),
    } satisfies ContentActionPort;
}
it("blocks publication and review after a failed save", async () => {
    const p = port();
    p.flushDraft.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useContentActions(p));
    await act(() => result.current.reviewPublication());
    expect(result.current.reviewOpen).toBe(false);
    expect(p.publish).not.toHaveBeenCalled();
    expect(result.current.error).toBe("offline");
});
it("reads first-save identity after flushing and excludes duplicate publications", async () => {
    const p = port();
    let slug: string | null = null;
    p.getResourceSlug = vi.fn(() => slug);
    p.flushDraft = vi.fn(async () => {
        slug = "created";
    });
    let finish!: () => void;
    p.publish = vi.fn(
        () =>
            new Promise<void>((resolve) => {
                finish = resolve;
            }),
    );
    const { result } = renderHook(() => useContentActions(p));
    await act(() => result.current.reviewPublication());
    expect(result.current.reviewOpen).toBe(true);
    let first!: Promise<void>;
    act(() => {
        first = result.current.confirmPublication();
        void result.current.confirmPublication();
    });
    await act(async () => {
        await Promise.resolve();
        finish();
        await first;
    });
    expect(p.publish).toHaveBeenCalledTimes(1);
});
it("requires renewed confirmation when the reviewed revision changes", async () => {
    const p = port();
    let revision = 1;
    p.getEditRevision = () => revision;
    const { result } = renderHook(() => useContentActions(p));
    await act(() => result.current.reviewPublication());
    revision++;
    await act(() => result.current.confirmPublication());
    expect(p.publish).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/changed/);
    await act(() => result.current.confirmPublication());
    expect(p.publish).toHaveBeenCalledOnce();
});
it.each(["discard", "delete"] as const)("%s waits for the in-flight blur save even if it fails", async (action) => {
    const p = port();
    let finish!: () => void;
    p.flushDraft = vi.fn(
        () =>
            new Promise<void>((resolve) => {
                finish = resolve;
            }),
    );
    const { result } = renderHook(() => useContentActions(p));
    let pending!: Promise<void>;
    act(() => {
        pending = result.current.confirmAction(action);
    });
    expect(p.discardDraft).not.toHaveBeenCalled();
    expect(p.deleteContent).not.toHaveBeenCalled();
    await act(async () => {
        finish();
        await pending;
    });
    expect(action === "discard" ? p.discardDraft : p.deleteContent).toHaveBeenCalledOnce();
});

it("blocks navigation when the latest save fails", async () => {
    const p = port();
    p.flushDraft.mockRejectedValue(new Error("offline"));
    const navigate = vi.fn();
    const { result } = renderHook(() => useContentActions(p));
    await act(() => result.current.navigate(navigate));
    expect(navigate).not.toHaveBeenCalled();
});

it("opens preview during the gesture, then uses identity returned by the save", async () => {
    const p = port();
    let slug: string | null = null;
    p.getResourceSlug = vi.fn(() => slug);
    p.flushDraft = vi.fn(async () => {
        slug = "created-on-flush";
    });
    const popup = { opener: window, location: { replace: vi.fn() }, close: vi.fn() };
    const open = vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    try {
        const { result } = renderHook(() => useContentActions(p));
        await act(async () => {
            result.current.preview((value) => `/journal/${value}?preview=1`);
        });
        expect(open).toHaveBeenCalledWith("about:blank", "_blank");
        expect(popup.opener).toBeNull();
        expect(popup.location.replace).toHaveBeenCalledWith("/journal/created-on-flush?preview=1");
    } finally {
        open.mockRestore();
    }
});

it("closes the pending preview tab when saving fails", async () => {
    const p = port();
    p.flushDraft.mockRejectedValue(new Error("offline"));
    const popup = { opener: window, location: { replace: vi.fn() }, close: vi.fn() };
    const open = vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    try {
        const { result } = renderHook(() => useContentActions(p));
        await act(async () => {
            result.current.preview((value) => `/journal/${value}?preview=1`);
        });
        expect(popup.close).toHaveBeenCalledOnce();
        expect(popup.location.replace).not.toHaveBeenCalled();
        expect(result.current.error).toBe("offline");
    } finally {
        open.mockRestore();
    }
});
