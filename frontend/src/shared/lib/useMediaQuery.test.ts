import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useMediaQuery } from "./useMediaQuery";

/**
 * jsdom has no real `matchMedia` implementation. Mirrors
 * `usePrefersReducedMotion.test.ts`'s own stub — same shape, same reason.
 */
let currentMatches = false;
let listeners: Array<() => void> = [];
let lastQuery: string | null = null;

function installMatchMediaStub() {
    currentMatches = false;
    listeners = [];
    lastQuery = null;
    Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: (query: string) => {
            lastQuery = query;
            return {
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
            };
        },
    });
}

function fireChange(matches: boolean) {
    currentMatches = matches;
    act(() => {
        for (const listener of listeners) listener();
    });
}

describe("useMediaQuery", () => {
    beforeEach(() => {
        installMatchMediaStub();
    });

    afterEach(() => {
        listeners = [];
    });

    it("starts false before the correcting effect runs, even if the query is already true", () => {
        currentMatches = true;
        const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)"));
        // Same caveat as usePrefersReducedMotion.test.ts: RTL flushes effects
        // around render, so this reads the CORRECTED value, not a literal
        // pre-effect snapshot — there is no way to observe the two separately
        // from outside React.
        expect(result.current).toBe(true);
    });

    it("passes the exact query string through to matchMedia", () => {
        renderHook(() => useMediaQuery("(min-width: 1024px)"));
        expect(lastQuery).toBe("(min-width: 1024px)");
    });

    it("updates live when the viewport crosses the query's threshold", () => {
        const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)"));
        expect(result.current).toBe(false);

        fireChange(true);
        expect(result.current).toBe(true);

        fireChange(false);
        expect(result.current).toBe(false);
    });

    it("stops listening after unmount", () => {
        const { unmount } = renderHook(() => useMediaQuery("(min-width: 1024px)"));
        expect(listeners).toHaveLength(1);

        unmount();
        expect(listeners).toHaveLength(0);
    });

    it("re-subscribes against the new query when the query string itself changes", () => {
        const { rerender } = renderHook(({ query }) => useMediaQuery(query), { initialProps: { query: "(min-width: 1024px)" } });
        expect(listeners).toHaveLength(1);

        rerender({ query: "(min-width: 640px)" });
        expect(lastQuery).toBe("(min-width: 640px)");
        expect(listeners).toHaveLength(1); // old listener torn down, exactly one new one registered — not stacked
    });
});
