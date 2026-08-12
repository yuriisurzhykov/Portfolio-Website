import { describe, expect, it, vi } from "vitest";
import type { ContentChange } from "@portfolio/backend";
import { combineContentChangeNotifiers } from "./combined-notifier";

const CHANGE: ContentChange = {
    kind: "post",
    slug: "my-post",
    previousSlug: null,
    isPublic: true,
    availableLocales: ["en"],
};

describe("combineContentChangeNotifiers", () => {
    it("calls every registered notifier with the same change", () => {
        const first = { contentChanged: vi.fn() };
        const second = { contentChanged: vi.fn() };

        combineContentChangeNotifiers([first, second]).contentChanged(CHANGE);

        expect(first.contentChanged).toHaveBeenCalledWith(CHANGE);
        expect(second.contentChanged).toHaveBeenCalledWith(CHANGE);
    });

    it("does nothing, without throwing, for an empty list", () => {
        expect(() => combineContentChangeNotifiers([]).contentChanged(CHANGE)).not.toThrow();
    });

    it("still calls the second notifier even if the first throws, and does not propagate", () => {
        const throwing = {
            contentChanged: () => {
                throw new Error("boom");
            },
        };
        const second = { contentChanged: vi.fn() };

        expect(() => combineContentChangeNotifiers([throwing, second]).contentChanged(CHANGE)).not.toThrow();
        expect(second.contentChanged).toHaveBeenCalledWith(CHANGE);
    });
});
