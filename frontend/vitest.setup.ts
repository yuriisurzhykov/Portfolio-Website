import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom does not provide the browser API used by MantineProvider.
Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn((media: string) => ({
        matches: false,
        media,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(() => true),
    })),
});

/**
 * Without this, every `render(...)` across every test file keeps its DOM
 * mounted for the rest of the run — harmless for a test that only queries
 * its own `render()` return value (`container.querySelector(...)`), but
 * any test using the global `screen` object (the more common, more
 * idiomatic React Testing Library style) starts finding elements left
 * over from a PREVIOUS test's render once more than one test in a file
 * renders the same markup — "found multiple elements," not a real bug in
 * the component under test. `@testing-library/react` normally auto-wires
 * this cleanup by detecting a global `afterEach`, which only exists here
 * if `test.globals: true` is set (it isn't) — so it's registered
 * explicitly instead, once, for every test file.
 */
afterEach(() => {
    cleanup();
});
