import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHideOnScroll } from "./useHideOnScroll";

/**
 * `act()` around the timer advance (not just the dispatch) matters here:
 * `vi.useFakeTimers()` fakes `requestAnimationFrame` itself (it's one of
 * its default-faked globals, alongside setTimeout/setInterval), so the
 * hook's rAF callback — where `setHidden()` actually happens — only runs
 * once fake time is advanced. Without wrapping that advance in `act()`,
 * React never flushes the resulting state update before the assertion
 * reads `result.current`.
 */
function scrollTo(y: number) {
    Object.defineProperty(window, "scrollY", { value: y, configurable: true });
    act(() => {
        window.dispatchEvent(new Event("scroll"));
        vi.advanceTimersToNextFrame();
    });
}

describe("useHideOnScroll", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("starts visible (not hidden)", () => {
        const { result } = renderHook(() => useHideOnScroll());
        expect(result.current).toBe(false);
    });

    it("stays visible while still within the reveal threshold, even if scrolling down", () => {
        const { result } = renderHook(() => useHideOnScroll(120));

        scrollTo(50);

        expect(result.current).toBe(false);
    });

    it("hides once scrolled down past the threshold", () => {
        const { result } = renderHook(() => useHideOnScroll(120));

        scrollTo(400);

        expect(result.current).toBe(true);
    });

    it("reveals again the moment the visitor scrolls up, even slightly", () => {
        const { result } = renderHook(() => useHideOnScroll(120));

        scrollTo(400);
        expect(result.current).toBe(true);

        scrollTo(380);

        expect(result.current).toBe(false);
    });

    it("reveals again once scrolled back near the top, regardless of direction", () => {
        const { result } = renderHook(() => useHideOnScroll(120));

        scrollTo(500);
        expect(result.current).toBe(true);

        scrollTo(20);

        expect(result.current).toBe(false);
    });
});
