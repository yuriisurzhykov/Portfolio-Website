import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * jsdom has no real `matchMedia` implementation — this stub is just enough
 * surface for the hook under test: a `matches` flag it reads once per
 * `handleChange()` call, and `addEventListener`/`removeEventListener` for
 * "change", tracked in `listeners` so `fireChange()` below can simulate the
 * OS setting flipping mid-session without a real browser.
 */
let currentMatches = false;
let listeners: Array<() => void> = [];

function installMatchMediaStub() {
    currentMatches = false;
    listeners = [];
    Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: (query: string) => ({
            media: query,
            get matches() {
                return currentMatches;
            },
            addEventListener: (_event: "change", listener: () => void) => {
                listeners.push(listener);
            },
            removeEventListener: (_event: "change", listener: () => void) => {
                listeners = listeners.filter((l) => l !== listener);
            },
        }),
    });
}

function fireChange(matches: boolean) {
    currentMatches = matches;
    act(() => {
        for (const listener of listeners) listener();
    });
}

describe("usePrefersReducedMotion", () => {
    beforeEach(() => {
        installMatchMediaStub();
    });

    afterEach(() => {
        listeners = [];
    });

    it("starts false on the very first render, before the effect has run", () => {
        currentMatches = true; // even if the OS setting is already "reduce"
        const { result } = renderHook(() => usePrefersReducedMotion());
        // React Testing Library flushes effects synchronously around render,
        // so by the time `result.current` is read here the corrective effect
        // has already run — this asserts the CORRECTED value, not the
        // pre-effect one (there is no way to observe a hook's value between
        // "rendered" and "effects flushed" from outside React itself).
        expect(result.current).toBe(true);
    });

    it("reflects the OS setting once the effect runs, when reduced motion is off", () => {
        currentMatches = false;
        const { result } = renderHook(() => usePrefersReducedMotion());
        expect(result.current).toBe(false);
    });

    it("updates live when the OS setting changes mid-session", () => {
        const { result } = renderHook(() => usePrefersReducedMotion());
        expect(result.current).toBe(false);

        fireChange(true);
        expect(result.current).toBe(true);

        fireChange(false);
        expect(result.current).toBe(false);
    });

    it("stops listening after unmount", () => {
        const { unmount } = renderHook(() => usePrefersReducedMotion());
        expect(listeners).toHaveLength(1);

        unmount();
        expect(listeners).toHaveLength(0);
    });
});
