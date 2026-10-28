import { describe, expect, it } from "vitest";
import { displayDomain, normalizeUrlKey } from "./url-key";

describe("normalizeUrlKey", () => {
    it("drops the fragment and tracking params, keeps real query params", () => {
        expect(normalizeUrlKey("https://Example.com/a?id=7&utm_source=x&fbclid=y#top")).toBe("https://example.com/a?id=7");
    });

    it("treats two links that differ only in tracking as one snapshot", () => {
        expect(normalizeUrlKey("https://example.com/a?utm_medium=mail")).toBe(normalizeUrlKey("https://example.com/a"));
    });

    it("rejects relative paths and non-web schemes", () => {
        expect(normalizeUrlKey("/work/portfolio")).toBeNull();
        expect(normalizeUrlKey("mailto:me@example.com")).toBeNull();
        expect(normalizeUrlKey("javascript:alert(1)")).toBeNull();
        expect(normalizeUrlKey("not a url")).toBeNull();
    });
});

describe("displayDomain", () => {
    it("strips www.", () => {
        expect(displayDomain("https://www.github.com/x")).toBe("github.com");
        expect(displayDomain("https://kotlinlang.org/docs")).toBe("kotlinlang.org");
    });
});
